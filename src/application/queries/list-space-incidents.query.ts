import { Query } from "./query.interface";

export interface ListSpaceIncidentsQuery extends Query {
    readonly type: 'LIST_SPACE_INCIDENTS';
    readonly spaceId: string;
}
