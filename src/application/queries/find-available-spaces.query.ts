import { Query } from "./query.interface";

export interface FindAvailableSpacesQuery extends Query {
    readonly type: 'FIND_AVAILABLE_SPACES';
    readonly start: string;
    readonly end: string;
}
