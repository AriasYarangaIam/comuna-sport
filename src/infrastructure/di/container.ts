import type { Router } from "express";
import type { Pool } from "pg";

import { CreateIncidentHandler } from "../../application/handlers/create-incident.handler";
import { CreateReservationHandler } from "../../application/handlers/create-reservation.handler";
import { FindAvailableSpacesHandler } from "../../application/handlers/find-available-spaces.handler";
import { GetIncidentHandler } from "../../application/handlers/get-incident.handler";
import { GetReservationHandler } from "../../application/handlers/get-reservation.handler";
import { GetSpaceHandler } from "../../application/handlers/get-space.handler";
import { ListSpaceIncidentsHandler } from "../../application/handlers/list-space-incidents.handler";
import { ListSpacesHandler } from "../../application/handlers/list-spaces.handler";
import { ListUserReservationsHandler } from "../../application/handlers/list-user-reservations.handler";
import type { CommandBus } from "../../application/ports/command-bus.interface";
import type { IdempotencyStore } from "../../application/ports/idempotency-store.interface";
import type { QueryBus } from "../../application/ports/query-bus.interface";
import { CommandBusService } from "../../application/services/command-bus.service";
import { QueryBusService } from "../../application/services/query-bus.service";
import type { IncidentReader, IncidentWriter } from "../../domain/repositories/incident.repository";
import type { ReservationReader, ReservationWriter } from "../../domain/repositories/reservation.repository";
import type { SpaceReader, SpaceWriter } from "../../domain/repositories/space.repository";
import type { CostCalculationStrategy } from "../../domain/services/cost-calculation/cost-calculation-strategy.interface";
import { CostStrategyFactory } from "../../domain/services/cost-calculation/cost-strategy-factory";
import { NeighborDefaultStrategy } from "../../domain/services/cost-calculation/neighbor-default.strategy";
import { PrivateClubStrategy } from "../../domain/services/cost-calculation/private-club.strategy";
import { SeniorDiscountStrategy } from "../../domain/services/cost-calculation/senior-discount.strategy";
import { IncidentController } from "../http/controllers/incident.controller";
import { ReservationController } from "../http/controllers/reservation.controller";
import { SpaceController } from "../http/controllers/space.controller";
import { createIdempotencyGuard } from "../http/middleware/idempotency.middleware";
import { createIncidentRoutes } from "../http/routes/incident.routes";
import { createReservationRoutes } from "../http/routes/reservation.routes";
import { createSpaceRoutes } from "../http/routes/space.routes";
import { NotificationListener } from "../event-bus/listeners/notification.listener";
import { LocalEventBus } from "../event-bus/local-event-bus.service";
import { inMemoryIdempotencyStore } from "../persistence/in-memory/idempotency.in-memory.store";
import { InMemoryIncidentRepository } from "../persistence/in-memory/incident.in-memory.repository";
import { InMemoryReservationRepository } from "../persistence/in-memory/reservation.in-memory.repository";
import { InMemorySpaceRepository } from "../persistence/in-memory/space.in-memory.repository";
import { PostgresIdempotencyStore } from "../persistence/postgres/idempotency.postgres.store";
import { PostgresIncidentRepository } from "../persistence/postgres/incident.postgres.repository";
import { createPool } from "../persistence/postgres/pool";
import { PostgresReservationRepository } from "../persistence/postgres/reservation.postgres.repository";
import { PostgresSpaceRepository } from "../persistence/postgres/space.postgres.repository";

export class Container {
    private readonly factories: Map<string, () => unknown> = new Map<string, () => unknown>();
    private readonly instances: Map<string, unknown> = new Map<string, unknown>();

    public register<T>(token: string, factory: () => T): void {
        this.factories.set(token, factory); // () => T is covariant in T: assignable to () => unknown, no cast.
    }

    public resolve<T>(token: string): T {
        if (this.instances.has(token)) {
            return this.instances.get(token) as T; // §11 blueprint cast — storage-variance lookup, not a payload cast.
        }
        const factory: (() => unknown) | undefined = this.factories.get(token);
        if (factory === undefined) {
            throw new Error(`No registration for: ${token}`);
        }
        const instance: unknown = factory();
        this.instances.set(token, instance);
        return instance as T; // §11 blueprint cast — storage-variance lookup, not a payload cast.
    }
}

export type ContainerTokens =
    | 'pool'
    | 'idempotencyStore'
    | 'spaceRepository'
    | 'reservationRepository'
    | 'incidentRepository'
    | 'eventBus'
    | 'notificationListener'
    | 'costStrategyFactory'
    | 'createReservationHandler'
    | 'createIncidentHandler'
    | 'commandBus'
    | 'listSpacesHandler'
    | 'getSpaceHandler'
    | 'findAvailableSpacesHandler'
    | 'getReservationHandler'
    | 'listUserReservationsHandler'
    | 'getIncidentHandler'
    | 'listSpaceIncidentsHandler'
    | 'queryBus'
    | 'reservationController'
    | 'incidentController'
    | 'spaceController'
    | 'reservationRoutes'
    | 'incidentRoutes'
    | 'spaceRoutes';

// Composition root — the ONLY place concretes appear (Singleton row, D2/D3 wiring).
// With a database URL the D3 ports bind to the PostgreSQL adapter; otherwise the
// in-memory adapter (auto-seeded) keeps the app usable and makes Jest hermetic.
export const buildContainer = (options: { readonly databaseUrl?: string } = {}): Container => {
    const container: Container = new Container();
    const databaseUrl: string | undefined = options.databaseUrl ?? process.env['DATABASE_URL'];

    if (databaseUrl !== undefined && databaseUrl !== '') {
        // §11 steps 2-5: one pool shared by every repository and the D4 store.
        container.register<Pool>('pool', (): Pool => createPool(databaseUrl));
        container.register<SpaceReader & SpaceWriter>('spaceRepository', (): SpaceReader & SpaceWriter =>
            new PostgresSpaceRepository(container.resolve<Pool>('pool')));
        container.register<ReservationReader & ReservationWriter>('reservationRepository', (): ReservationReader & ReservationWriter =>
            new PostgresReservationRepository(container.resolve<Pool>('pool')));
        container.register<IncidentReader & IncidentWriter>('incidentRepository', (): IncidentReader & IncidentWriter =>
            new PostgresIncidentRepository(container.resolve<Pool>('pool')));
        container.register<IdempotencyStore>('idempotencyStore', (): IdempotencyStore =>
            new PostgresIdempotencyStore(container.resolve<Pool>('pool')));
    } else {
        container.register('spaceRepository', (): InMemorySpaceRepository => new InMemorySpaceRepository());
        container.register('reservationRepository', (): InMemoryReservationRepository => new InMemoryReservationRepository());
        container.register('incidentRepository', (): InMemoryIncidentRepository => new InMemoryIncidentRepository());
        container.register<IdempotencyStore>('idempotencyStore', (): IdempotencyStore => inMemoryIdempotencyStore);
    }

    container.register('eventBus', (): LocalEventBus => new LocalEventBus());
    container.register('notificationListener', (): NotificationListener => new NotificationListener());

    container.register('costStrategyFactory', (): CostStrategyFactory => {
        const factory: CostStrategyFactory = new CostStrategyFactory();
        factory.register('NEIGHBOR', (): CostCalculationStrategy => new NeighborDefaultStrategy());
        factory.register('YOUTH', (): CostCalculationStrategy => new NeighborDefaultStrategy());
        factory.register('SENIOR', (): CostCalculationStrategy => new SeniorDiscountStrategy());
        factory.register('PRIVATE_CLUB', (): CostCalculationStrategy => new PrivateClubStrategy());
        return factory;
    });

    // §11 step 6: command handlers depend on the PORTS (Reader/Writer), never on
    // a concrete adapter — the same wiring works for memory and PostgreSQL.
    container.register('createReservationHandler', (): CreateReservationHandler =>
        new CreateReservationHandler(
            container.resolve<SpaceReader>('spaceRepository'),
            container.resolve<ReservationReader>('reservationRepository'),
            container.resolve<ReservationWriter>('reservationRepository'),
            container.resolve<CostStrategyFactory>('costStrategyFactory'),
            container.resolve<LocalEventBus>('eventBus')
        ));

    container.register('createIncidentHandler', (): CreateIncidentHandler =>
        new CreateIncidentHandler(
            container.resolve<SpaceReader>('spaceRepository'),
            container.resolve<IncidentWriter>('incidentRepository')
        ));

    // §11 step 7: command bus with registered handlers.
    container.register('commandBus', (): CommandBusService => {
        const bus: CommandBusService = new CommandBusService();
        bus.register(container.resolve<CreateReservationHandler>('createReservationHandler'));
        bus.register(container.resolve<CreateIncidentHandler>('createIncidentHandler'));
        return bus;
    });

    container.register('spaceController', (): SpaceController =>
        new SpaceController(container.resolve<QueryBus>('queryBus')));

    container.register('reservationController', (): ReservationController =>
        new ReservationController(container.resolve<CommandBus>('commandBus'), container.resolve<QueryBus>('queryBus')));

    container.register('incidentController', (): IncidentController =>
        new IncidentController(container.resolve<CommandBus>('commandBus'), container.resolve<QueryBus>('queryBus')));

    // Read side mirrors the write side: one handler per query, each bound to the
    // Reader PORTS, registered by query type into the bus.
    container.register('listSpacesHandler', (): ListSpacesHandler =>
        new ListSpacesHandler(container.resolve<SpaceReader>('spaceRepository')));

    container.register('getSpaceHandler', (): GetSpaceHandler =>
        new GetSpaceHandler(container.resolve<SpaceReader>('spaceRepository')));

    container.register('findAvailableSpacesHandler', (): FindAvailableSpacesHandler =>
        new FindAvailableSpacesHandler(container.resolve<SpaceReader>('spaceRepository')));

    container.register('getReservationHandler', (): GetReservationHandler =>
        new GetReservationHandler(container.resolve<ReservationReader>('reservationRepository')));

    container.register('listUserReservationsHandler', (): ListUserReservationsHandler =>
        new ListUserReservationsHandler(container.resolve<ReservationReader>('reservationRepository')));

    container.register('getIncidentHandler', (): GetIncidentHandler =>
        new GetIncidentHandler(container.resolve<IncidentReader>('incidentRepository')));

    container.register('listSpaceIncidentsHandler', (): ListSpaceIncidentsHandler =>
        new ListSpaceIncidentsHandler(container.resolve<IncidentReader>('incidentRepository')));

    container.register('queryBus', (): QueryBusService => {
        const bus: QueryBusService = new QueryBusService();
        bus.register(container.resolve<ListSpacesHandler>('listSpacesHandler'));
        bus.register(container.resolve<GetSpaceHandler>('getSpaceHandler'));
        bus.register(container.resolve<FindAvailableSpacesHandler>('findAvailableSpacesHandler'));
        bus.register(container.resolve<GetReservationHandler>('getReservationHandler'));
        bus.register(container.resolve<ListUserReservationsHandler>('listUserReservationsHandler'));
        bus.register(container.resolve<GetIncidentHandler>('getIncidentHandler'));
        bus.register(container.resolve<ListSpaceIncidentsHandler>('listSpaceIncidentsHandler'));
        return bus;
    });

    container.register('reservationRoutes', (): Router =>
        createReservationRoutes(
            container.resolve<ReservationController>('reservationController'),
            createIdempotencyGuard(container.resolve<IdempotencyStore>('idempotencyStore'))
        ));

    container.register('incidentRoutes', (): Router =>
        createIncidentRoutes(container.resolve<IncidentController>('incidentController')));

    container.register('spaceRoutes', (): Router =>
        createSpaceRoutes(container.resolve<SpaceController>('spaceController')));

    // §11 step 4: subscribe the notification listener to the event bus — the
    // listener is typed against the concrete event, so the literal below is
    // compile-checked against ReservationConfirmedEvent['type'].
    const eventBus: LocalEventBus = container.resolve<LocalEventBus>('eventBus');
    const notificationListener: NotificationListener = container.resolve<NotificationListener>('notificationListener');
    eventBus.subscribe('ReservationConfirmed', notificationListener);

    return container;
};
