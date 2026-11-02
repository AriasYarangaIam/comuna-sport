import { Query } from "./query.interface";

export interface GetReservationQuery extends Query {
    readonly type: 'GET_RESERVATION';
    readonly reservationId: string;
}
