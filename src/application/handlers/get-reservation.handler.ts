import { Reservation } from "../../domain/entities/reservation.entity";
import { EntityNotFoundException } from "../../domain/exceptions/entity-not-found.exception";
import { ReservationReader } from "../../domain/repositories/reservation.repository";
import { SpaceReader } from "../../domain/repositories/space.repository";
import { slugify } from "../../domain/services/slugify";
import { ReservationId } from "../../domain/value-objects/reservation-id.vo";
import { ReservationResponseDto, toReservationResponseDto } from "../dtos/reservation-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { GetReservationQuery } from "../queries/get-reservation.query";

export class GetReservationHandler implements QueryHandler<GetReservationQuery, ReservationResponseDto> {
    public readonly queryType: GetReservationQuery['type'] = 'GET_RESERVATION';

    public constructor(
        private readonly reservationReader: ReservationReader,
        private readonly spaceReader: SpaceReader
    ) {}

    public async execute(query: GetReservationQuery): Promise<ReservationResponseDto> {
        const reservationId: ReservationId = ReservationId.create(query.reservationId);

        const reservation: Reservation | null = await this.reservationReader.findById(reservationId);
        if (reservation === null) {
            throw new EntityNotFoundException(`reservation not found: ${query.reservationId}`, 'RESERVATION_NOT_FOUND');
        }

        // S1: the response addresses the space by slug; the reservation row
        // only carries the internal SpaceId, so the slug resolves through the
        // reader (a reservation whose space is gone is a broken aggregate).
        const space = await this.spaceReader.findById(reservation.spaceId);
        if (space === null) {
            throw new EntityNotFoundException(`space not found: ${reservation.spaceId.value}`, 'SPACE_NOT_FOUND');
        }

        return toReservationResponseDto(reservation, slugify(space.name));
    }
}
