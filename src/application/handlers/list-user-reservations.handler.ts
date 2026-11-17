import { Reservation } from "../../domain/entities/reservation.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { ReservationReader } from "../../domain/repositories/reservation.repository";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { slugify } from "../../domain/services/slugify";
import { ReservationResponseDto, toReservationResponseDto } from "../dtos/reservation-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { ListUserReservationsQuery } from "../queries/list-user-reservations.query";

export class ListUserReservationsHandler implements QueryHandler<ListUserReservationsQuery, ReservationResponseDto[]> {
    public readonly queryType: ListUserReservationsQuery['type'] = 'LIST_USER_RESERVATIONS';

    public constructor(
        private readonly reservationReader: ReservationReader,
        private readonly spaceReader: SpaceReader
    ) {}

    public async execute(query: ListUserReservationsQuery): Promise<ReservationResponseDto[]> {
        // S4: the query carries the citizen DNI (validated at the boundary);
        // the rows are keyed by it internally, unchanged.
        const reservations: Reservation[] = await this.reservationReader.findByUserId(query.dni);

        // S1: resolve each distinct space once — the slug is not stored on the
        // reservation, only the internal SpaceId is.
        const slugBySpaceId = new Map<string, string>();
        const dto: ReservationResponseDto[] = [];
        for (const reservation of reservations) {
            let slug: string | undefined = slugBySpaceId.get(reservation.spaceId.value);
            if (slug === undefined) {
                const space = await this.spaceReader.findById(reservation.spaceId);
                if (space === null) {
                    throw new EntityNotFoundException(`space not found: ${reservation.spaceId.value}`, 'SPACE_NOT_FOUND');
                }
                slug = slugify(space.name);
                slugBySpaceId.set(reservation.spaceId.value, slug);
            }
            dto.push(toReservationResponseDto(reservation, slug));
        }
        return dto;
    }
}
