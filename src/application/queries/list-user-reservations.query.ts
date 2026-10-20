import { Query } from "./query.interface";

export interface ListUserReservationsQuery extends Query {
    readonly type: 'LIST_USER_RESERVATIONS';
    readonly userId: string;
}
