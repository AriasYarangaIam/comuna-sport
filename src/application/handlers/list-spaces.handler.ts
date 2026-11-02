import { Space } from "../../domain/entities/space.entity";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { SpaceResponseDto, toSpaceResponseDto } from "../dtos/space-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { ListSpacesQuery } from "../queries/list-spaces.query";

export class ListSpacesHandler implements QueryHandler<ListSpacesQuery, SpaceResponseDto[]> {
    public readonly queryType: ListSpacesQuery['type'] = 'LIST_SPACES';

    public constructor(private readonly spaceReader: SpaceReader) {}

    public async execute(_query: ListSpacesQuery): Promise<SpaceResponseDto[]> {
        const spaces: Space[] = await this.spaceReader.findAll();

        return spaces.map((space: Space): SpaceResponseDto => toSpaceResponseDto(space));
    }
}
