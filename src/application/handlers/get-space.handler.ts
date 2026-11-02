import { Space } from "../../domain/entities/space.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { SpaceId } from "../../domain/value-objects/space-id.vo";
import { SpaceResponseDto, toSpaceResponseDto } from "../dtos/space-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { GetSpaceQuery } from "../queries/get-space.query";

export class GetSpaceHandler implements QueryHandler<GetSpaceQuery, SpaceResponseDto> {
    public readonly queryType: GetSpaceQuery['type'] = 'GET_SPACE';

    public constructor(private readonly spaceReader: SpaceReader) {}

    public async execute(query: GetSpaceQuery): Promise<SpaceResponseDto> {
        const spaceId: SpaceId = SpaceId.create(query.spaceId);

        const space: Space | null = await this.spaceReader.findById(spaceId);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${query.spaceId}`, 'SPACE_NOT_FOUND');
        }

        return toSpaceResponseDto(space);
    }
}
