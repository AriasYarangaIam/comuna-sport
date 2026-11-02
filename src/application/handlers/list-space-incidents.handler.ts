import { Incident } from "../../domain/entities/incident.entity";
import { IncidentReader } from "../../domain/repositories/incident.repository";
import { SpaceId } from "../../domain/value-objects/space-id.vo";
import { IncidentResponseDto, toIncidentResponseDto } from "../dtos/incident-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { ListSpaceIncidentsQuery } from "../queries/list-space-incidents.query";

export class ListSpaceIncidentsHandler implements QueryHandler<ListSpaceIncidentsQuery, IncidentResponseDto[]> {
    public readonly queryType: ListSpaceIncidentsQuery['type'] = 'LIST_SPACE_INCIDENTS';

    public constructor(private readonly incidentReader: IncidentReader) {}

    public async execute(query: ListSpaceIncidentsQuery): Promise<IncidentResponseDto[]> {
        // Validating the id here means a malformed id is a 400, never a silent
        // empty list (SpaceId.create throws a plain Error → BAD_REQUEST).
        const spaceId: SpaceId = SpaceId.create(query.spaceId);

        const incidents: Incident[] = await this.incidentReader.findBySpaceId(spaceId);

        return incidents.map((incident: Incident): IncidentResponseDto => toIncidentResponseDto(incident));
    }
}
