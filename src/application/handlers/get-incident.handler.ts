import { Incident } from "../../domain/entities/incident.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { IncidentReader } from "../../domain/repositories/incident.repository";
import { IncidentId } from "../../domain/value-objects/incident-id.vo";
import { IncidentResponseDto, toIncidentResponseDto } from "../dtos/incident-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { GetIncidentQuery } from "../queries/get-incident.query";

export class GetIncidentHandler implements QueryHandler<GetIncidentQuery, IncidentResponseDto> {
    public readonly queryType: GetIncidentQuery['type'] = 'GET_INCIDENT';

    public constructor(private readonly incidentReader: IncidentReader) {}

    public async execute(query: GetIncidentQuery): Promise<IncidentResponseDto> {
        const incidentId: IncidentId = IncidentId.create(query.incidentId);

        const incident: Incident | null = await this.incidentReader.findById(incidentId);
        if (incident === null) {
            throw new EntityNotFoundException(`incident not found: ${query.incidentId}`, 'INCIDENT_NOT_FOUND');
        }

        return toIncidentResponseDto(incident);
    }
}
