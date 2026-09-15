import { DomainEvent, EventListener } from "./domain-event.interface";

export interface DomainEventBus {
    publish<T extends DomainEvent>(event: T): Promise<void>;
    subscribe<T extends DomainEvent>(eventType: T['type'], listener: EventListener<T>): void;
}