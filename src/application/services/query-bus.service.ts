import { Query } from "../queries/query.interface";
import { QueryBus, QueryHandler } from "../ports/query-bus.interface";

export class QueryBusService implements QueryBus {
    private readonly handlers = new Map<string, QueryHandler<Query, unknown>>();

    public register<TQuery extends Query, TResult>(handler: QueryHandler<TQuery, TResult>): void {
        // Permitted variance cast for the heterogeneous handler map — the ONLY `as` in this class.
        this.handlers.set(handler.queryType, handler as QueryHandler<Query, unknown>);
    }

    public async execute<TResult>(query: Query): Promise<TResult> {
        const handler = this.handlers.get(query.type);
        if (handler === undefined) {
            throw new Error(`No handler registered for query: ${query.type}`);
        }
        // Promise-level variance cast (DEVELOPMENT.md §10 CommandBus note) — no `any`, no payload casts.
        return handler.execute(query) as Promise<TResult>;
    }
}
