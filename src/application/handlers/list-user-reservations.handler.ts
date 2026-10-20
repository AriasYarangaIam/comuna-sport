import { Reservation } from "../../domain/entities/reservation.entity";
import { ReservationReader } from "../../domain/repositories/reservation.repository";
import { ReservationResponseDto, toReservationResponseDto } from "../dtos/reservation-response.dto";
import { QueryHandler } from "../ports/query-bus.interface";
import { ListUserReservationsQuery } from "../queries/list-user-reservations.query";

export class ListUserReservationsHandler implements QueryHandler<ListUserReservationsQuery, ReservationResponseDto[]> {
    public readonly queryType: ListUserReservationsQuery['type'] = 'LIST_USER_RESERVATIONS';

    public constructor(private readonly reservationReader: ReservationReader) {}

    public async execute(query: ListUserReservationsQuery): Promise<ReservationResponseDto[]> {
        const reservations: Reservation[] = await this.reservationReader.findByUserId(query.userId);

        return reservations.map((reservation: Reservation): ReservationResponseDto => toReservationResponseDto(reservation));
    }
}
