import { Query } from "../queries/query.interface";

export interface QueryHandler<TQuery extends Query, TResult> {
    readonly queryType: TQuery['type'];
    execute(query: TQuery): Promise<TResult>;
}

export interface QueryBus {
    register<TQuery extends Query, TResult>(handler: QueryHandler<TQuery, TResult>): void;
    execute<TResult>(query: Query): Promise<TResult>;
}
