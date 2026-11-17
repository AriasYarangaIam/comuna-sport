import { Space } from "../../domain/entities/space.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { SpaceResponseDto, toSpaceResponseDto } from "../dtos/space-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { GetSpaceQuery } from "../queries/get-space.query";

export class GetSpaceHandler implements QueryHandler<GetSpaceQuery, SpaceResponseDto> {
    public readonly queryType: GetSpaceQuery['type'] = 'GET_SPACE';

    public constructor(private readonly spaceReader: SpaceReader) {}

    public async execute(query: GetSpaceQuery): Promise<SpaceResponseDto> {
        // S1: the public identifier is the slug; a malformed or unknown slug is
        // the same 404 SPACE_NOT_FOUND (no UUID validation step in between).
        const space: Space | null = await this.spaceReader.findBySlug(query.spaceSlug);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${query.spaceSlug}`, 'SPACE_NOT_FOUND');
        }

        return toSpaceResponseDto(space);
    }
}
