import { Incident } from "../../domain/entities/incident.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { IncidentWriter } from "../../domain/repositories/incident.repository";
import { Space } from "../../domain/entities/space.entity";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { CreateIncidentCommand } from "../commands/create-incident.command";
import { IncidentResponseDto, toIncidentResponseDto } from "../dtos/incident-response.dto";
import { CommandHandler } from "../ports/command-bus.interface";

export class CreateIncidentHandler implements CommandHandler<CreateIncidentCommand, IncidentResponseDto> {
    public readonly commandType: CreateIncidentCommand['type'] = 'CREATE_INCIDENT';

    public constructor(
        private readonly spaceReader: SpaceReader,
        private readonly incidentWriter: IncidentWriter
    ) {}

    public async execute(command: CreateIncidentCommand): Promise<IncidentResponseDto> {
        // S1/S3: the command carries the public slug and the reporter's DNI;
        // the UUID SpaceId is resolved here, inside the application boundary.
        const space: Space | null = await this.spaceReader.findBySlug(command.spaceSlug);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${command.spaceSlug}`, 'SPACE_NOT_FOUND');
        }
        if (!space.isActive) {
            // Unchanged behaviour (error → 400 BAD_REQUEST with this message):
            // only the identifier that reaches the entity changed.
            throw new Error('cannot file incident on inactive space');
        }

        const incident = Incident.create({
            spaceId: space.id,
            reporterId: command.dni,
            description: command.description
        });

        await this.incidentWriter.save(incident);

        return toIncidentResponseDto(incident, command.spaceSlug);
    }
}
