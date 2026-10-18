import { CreateIncidentHandler } from "../../application/handlers/create-incident.handler";
import { CreateReservationHandler } from "../../application/handlers/create-reservation.handler";
import type { CommandBus } from "../../application/ports/command-bus.interface";
import { CommandBusService } from "../../application/services/command-bus.service";
import type { CostCalculationStrategy } from "../../domain/services/cost-calculation/cost-calculation-strategy.interface";
import { CostStrategyFactory } from "../../domain/services/cost-calculation/cost-strategy-factory";
import { NeighborDefaultStrategy } from "../../domain/services/cost-calculation/neighbor-default.strategy";
import { PrivateClubStrategy } from "../../domain/services/cost-calculation/private-club.strategy";
import { SeniorDiscountStrategy } from "../../domain/services/cost-calculation/senior-discount.strategy";
import { IncidentController } from "../http/controllers/incident.controller";
import { ReservationController } from "../http/controllers/reservation.controller";
import { createIncidentRoutes } from "../http/routes/incident.routes";
import { createReservationRoutes } from "../http/routes/reservation.routes";
import { NotificationListener } from "../event-bus/listeners/notification.listener";
import { LocalEventBus } from "../event-bus/local-event-bus.service";
import { InMemoryIncidentRepository } from "../persistence/in-memory/incident.in-memory.repository";
import { InMemoryReservationRepository } from "../persistence/in-memory/reservation.in-memory.repository";
import { InMemorySpaceRepository } from "../persistence/in-memory/space.in-memory.repository";
import type { Router } from "express";

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
    | 'spaceRepository'
    | 'reservationRepository'
    | 'incidentRepository'
    | 'eventBus'
    | 'notificationListener'
    | 'costStrategyFactory'
    | 'createReservationHandler'
    | 'createIncidentHandler'
    | 'commandBus'
    | 'reservationController'
    | 'incidentController'
    | 'reservationRoutes'
    | 'incidentRoutes';

// Composition root — the ONLY place concretes appear (Singleton row, D2/D3 wiring).
export const buildContainer = (): Container => {
    const container: Container = new Container();

    // §11 steps 2-5: repositories (in-memory, Reader+Writer each), event bus,
    // notification listener, cost strategy factory with strategy registration (D2).
    container.register('spaceRepository', (): InMemorySpaceRepository => new InMemorySpaceRepository());
    container.register('reservationRepository', (): InMemoryReservationRepository => new InMemoryReservationRepository());
    container.register('incidentRepository', (): InMemoryIncidentRepository => new InMemoryIncidentRepository());

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

    // §11 step 6: command handlers (Reader ports where no write — D3).
    container.register('createReservationHandler', (): CreateReservationHandler =>
        new CreateReservationHandler(
            container.resolve<InMemorySpaceRepository>('spaceRepository'),
            container.resolve<InMemoryReservationRepository>('reservationRepository'),
            container.resolve<InMemoryReservationRepository>('reservationRepository'),
            container.resolve<CostStrategyFactory>('costStrategyFactory'),
            container.resolve<LocalEventBus>('eventBus')
        ));

    container.register('createIncidentHandler', (): CreateIncidentHandler =>
        new CreateIncidentHandler(
            container.resolve<InMemorySpaceRepository>('spaceRepository'),
            container.resolve<InMemoryIncidentRepository>('incidentRepository')
        ));

    // §11 step 7: command bus with registered handlers.
    container.register('commandBus', (): CommandBusService => {
        const bus: CommandBusService = new CommandBusService();
        bus.register(container.resolve<CreateReservationHandler>('createReservationHandler'));
        bus.register(container.resolve<CreateIncidentHandler>('createIncidentHandler'));
        return bus;
    });

    container.register('reservationController', (): ReservationController =>
        new ReservationController(container.resolve<CommandBus>('commandBus')));

    container.register('incidentController', (): IncidentController =>
        new IncidentController(container.resolve<CommandBus>('commandBus')));

    container.register('reservationRoutes', (): Router =>
        createReservationRoutes(container.resolve<ReservationController>('reservationController')));

    container.register('incidentRoutes', (): Router =>
        createIncidentRoutes(container.resolve<IncidentController>('incidentController')));

    // §11 step 4: subscribe the notification listener to the event bus — the
    // listener is typed against the concrete event, so the literal below is
    // compile-checked against ReservationConfirmedEvent['type'].
    const eventBus: LocalEventBus = container.resolve<LocalEventBus>('eventBus');
    const notificationListener: NotificationListener = container.resolve<NotificationListener>('notificationListener');
    eventBus.subscribe('ReservationConfirmed', notificationListener);

    return container;
};
