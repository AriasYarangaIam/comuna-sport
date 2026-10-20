import { Query } from "./query.interface";

export interface ListSpacesQuery extends Query {
    readonly type: 'LIST_SPACES';
}
