import { Space } from "../../domain/entities/space.entity";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { TimeSlot } from "../../domain/value-objects/time-slot.vo";
import { SpaceResponseDto, toSpaceResponseDto } from "../dtos/space-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { FindAvailableSpacesQuery } from "../queries/find-available-spaces.query";

export class FindAvailableSpacesHandler implements QueryHandler<FindAvailableSpacesQuery, SpaceResponseDto[]> {
    public readonly queryType: FindAvailableSpacesQuery['type'] = 'FIND_AVAILABLE_SPACES';

    public constructor(private readonly spaceReader: SpaceReader) {}

    public async execute(query: FindAvailableSpacesQuery): Promise<SpaceResponseDto[]> {
        // TimeSlot enforces the same-business-day invariant; a malformed band
        // surfaces as a plain Error and the error handler maps it to 400.
        const timeSlot: TimeSlot = TimeSlot.create(new Date(query.start), new Date(query.end));

        const spaces: Space[] = await this.spaceReader.findByAvailability(timeSlot);

        return spaces.map((space: Space): SpaceResponseDto => toSpaceResponseDto(space));
    }
}
