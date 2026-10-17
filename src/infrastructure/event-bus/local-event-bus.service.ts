import type { DomainEventBus } from "../../domain/events/domain-event-bus.interface";
import type { DomainEvent, EventListener } from "../../domain/events/domain-event.interface";

export class LocalEventBus implements DomainEventBus {
    // Registry keyed by the event `type` literal; Set storage deduplicates
    // handlers (the same handler reference is registered once).
    private readonly listeners: Map<string, Set<EventListener<DomainEvent>>> = new Map<string, Set<EventListener<DomainEvent>>>();

    public subscribe<TEvent extends DomainEvent>(eventType: TEvent['type'], listener: EventListener<TEvent>): void {
        const set: Set<EventListener<DomainEvent>> = this.listeners.get(eventType) ?? new Set<EventListener<DomainEvent>>();
        // Permitted registry-variance cast (DEVELOPMENT.md §11) — NOT a payload cast.
        set.add(listener as EventListener<DomainEvent>);
        this.listeners.set(eventType, set);
    }

    public async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
        const set: Set<EventListener<DomainEvent>> | undefined = this.listeners.get(event.type);
        if (set === undefined) {
            return;
        }
        const results: Array<PromiseSettledResult<void>> = await Promise.allSettled(
            [...set].map((listener: EventListener<DomainEvent>): Promise<void> => listener.handle(event))
        );
        for (const result of results) {
            if (result.status === 'rejected') {
                // Publisher NEVER throws — handler failures are logged, not propagated.
                console.error('Event handler failed:', result.reason);
            }
        }
    }
}
