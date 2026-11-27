import { Incident } from "../../domain/entities/incident.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { IncidentReader, IncidentWriter } from "../../domain/repositories/incident.repository";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { slugify } from "../../domain/services/slugify";
import { IncidentId } from "../../domain/value-objects/incident-id.vo";
import { ChangeIncidentStateCommand } from "../commands/change-incident-state.command";
import { IncidentResponseDto, toIncidentResponseDto } from "../dtos/incident-response.dto";
import { CommandHandler } from "../ports/command-bus.interface";

// S1 (odd/tasks/demo-completion.md): the incident aggregate already owned the
// transitions; this handler is the application path that reaches them. The
// state machine decides what is legal — an invalid transition throws
// InvalidStateTransitionException and the error handler maps it to 422.
export class ChangeIncidentStateHandler implements CommandHandler<ChangeIncidentStateCommand, IncidentResponseDto> {
    public readonly commandType: ChangeIncidentStateCommand['type'] = 'CHANGE_INCIDENT_STATE';

    public constructor(
        private readonly incidentReader: IncidentReader,
        private readonly incidentWriter: IncidentWriter,
        private readonly spaceReader: SpaceReader
    ) {}

    public async execute(command: ChangeIncidentStateCommand): Promise<IncidentResponseDto> {
        const incidentId: IncidentId = IncidentId.create(command.incidentId);

        const incident: Incident | null = await this.incidentReader.findById(incidentId);
        if (incident === null) {
            throw new EntityNotFoundException(`incident not found: ${command.incidentId}`, 'INCIDENT_NOT_FOUND');
        }

        if (command.state === 'APPROVED') {
            incident.approve();
        } else if (command.state === 'REJECTED') {
            incident.reject();
        } else {
            incident.resolve();
        }

        await this.incidentWriter.save(incident);

        const space = await this.spaceReader.findById(incident.spaceId);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${incident.spaceId.value}`, 'SPACE_NOT_FOUND');
        }

        return toIncidentResponseDto(incident, slugify(space.name));
    }
}
