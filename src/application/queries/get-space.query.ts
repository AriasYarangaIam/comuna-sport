import { Query } from "./query.interface";

export interface GetSpaceQuery extends Query {
    readonly type: 'GET_SPACE';
    readonly spaceId: string;
}
