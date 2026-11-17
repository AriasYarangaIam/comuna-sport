import { Incident } from "../../domain/entities/incident.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { IncidentReader } from "../../domain/repositories/incident.repository";
import { Space } from "../../domain/entities/space.entity";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { IncidentResponseDto, toIncidentResponseDto } from "../dtos/incident-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { ListSpaceIncidentsQuery } from "../queries/list-space-incidents.query";

export class ListSpaceIncidentsHandler implements QueryHandler<ListSpaceIncidentsQuery, IncidentResponseDto[]> {
    public readonly queryType: ListSpaceIncidentsQuery['type'] = 'LIST_SPACE_INCIDENTS';

    public constructor(
        private readonly incidentReader: IncidentReader,
        private readonly spaceReader: SpaceReader
    ) {}

    public async execute(query: ListSpaceIncidentsQuery): Promise<IncidentResponseDto[]> {
        // S1: the public identifier is the slug — an unknown slug is the same
        // 404 SPACE_NOT_FOUND, never a silent empty list.
        const space: Space | null = await this.spaceReader.findBySlug(query.spaceSlug);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${query.spaceSlug}`, 'SPACE_NOT_FOUND');
        }

        const incidents: Incident[] = await this.incidentReader.findBySpaceId(space.id);

        return incidents.map((incident: Incident): IncidentResponseDto => toIncidentResponseDto(incident, query.spaceSlug));
    }
}
