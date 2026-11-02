import { Query } from "./query.interface";

export interface GetIncidentQuery extends Query {
    readonly type: 'GET_INCIDENT';
    readonly incidentId: string;
}
