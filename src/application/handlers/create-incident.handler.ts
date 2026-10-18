import { Incident } from "../../domain/entities/incident.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { IncidentWriter } from "../../domain/repositories/incident.repository";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { SpaceId } from "../../domain/value-objects/space-id.vo";
import { CreateIncidentCommand } from "../commands/create-incident.command";
import { IncidentResponseDto } from "../dtos/incident-response.dto";
import { CommandHandler } from "../ports/command-bus.interface";

export class CreateIncidentHandler implements CommandHandler<CreateIncidentCommand, IncidentResponseDto> {
    public readonly commandType: CreateIncidentCommand['type'] = 'CREATE_INCIDENT';

    public constructor(
        private readonly spaceReader: SpaceReader,
        private readonly incidentWriter: IncidentWriter
    ) {}

    public async execute(command: CreateIncidentCommand): Promise<IncidentResponseDto> {
        const spaceId: SpaceId = SpaceId.create(command.spaceId);

        const space = await this.spaceReader.findById(spaceId);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${command.spaceId}`);
        }
        if (!space.isActive) {
            throw new Error('cannot file incident on inactive space');
        }

        const incident = Incident.create({
            spaceId: spaceId,
            reporterId: command.reporterId,
            description: command.description
        });

        await this.incidentWriter.save(incident);

        return toIncidentResponseDto(incident);
    }
}

function toIncidentResponseDto(incident: Incident): IncidentResponseDto {
    return {
        id: incident.id.value,
        spaceId: incident.spaceId.value,
        reporterId: incident.reporterId,
        description: incident.description,
        state: incident.getState(),
        createdAt: incident.createdAt.toISOString(),
        resolvedAt: incident.resolvedAt === null ? null : incident.resolvedAt.toISOString()
    };
}
