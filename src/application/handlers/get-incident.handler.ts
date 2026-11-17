import { Incident } from "../../domain/entities/incident.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { IncidentReader } from "../../domain/repositories/incident.repository";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { slugify } from "../../domain/services/slugify";
import { IncidentId } from "../../domain/value-objects/incident-id.vo";
import { IncidentResponseDto, toIncidentResponseDto } from "../dtos/incident-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { GetIncidentQuery } from "../queries/get-incident.query";

export class GetIncidentHandler implements QueryHandler<GetIncidentQuery, IncidentResponseDto> {
    public readonly queryType: GetIncidentQuery['type'] = 'GET_INCIDENT';

    public constructor(
        private readonly incidentReader: IncidentReader,
        private readonly spaceReader: SpaceReader
    ) {}

    public async execute(query: GetIncidentQuery): Promise<IncidentResponseDto> {
        const incidentId: IncidentId = IncidentId.create(query.incidentId);

        const incident: Incident | null = await this.incidentReader.findById(incidentId);
        if (incident === null) {
            throw new EntityNotFoundException(`incident not found: ${query.incidentId}`, 'INCIDENT_NOT_FOUND');
        }

        // S1: the response addresses the space by slug (resolved through the
        // reader — the incident row only carries the internal SpaceId).
        const space = await this.spaceReader.findById(incident.spaceId);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${incident.spaceId.value}`, 'SPACE_NOT_FOUND');
        }

        return toIncidentResponseDto(incident, slugify(space.name));
    }
}
