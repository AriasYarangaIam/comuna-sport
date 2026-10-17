/// <reference types="node" />
/// <reference types="jest" />

import { LocalEventBus } from "../../src/infrastructure/event-bus/local-event-bus.service";
import type { DomainEvent, EventListener } from "../../src/domain/events/domain-event.interface";

// A minimal typed domain event for testing (same shape as
// ReservationConfirmedEvent: literal `type`, occurredOn, payload fields).
class TestEvent implements DomainEvent {
    public readonly type = 'TestEvent' as const;
    public readonly occurredOn: Date;
    public readonly payload: number;

    public constructor(payload: number) {
        this.occurredOn = new Date();
        this.payload = payload;
    }
}

const buildListener = (
    name: string,
    seen: string[]
): EventListener<TestEvent> => ({
    handle: async (event: TestEvent): Promise<void> => {
        seen.push(name);
        void event;
    },
});

const failingListener = (): EventListener<TestEvent> => ({
    handle: async (_event: TestEvent): Promise<void> => {
        throw new Error('listener exploded');
    },
});

describe('LocalEventBus', (): void => {
    it('invokes a subscribed listener on publish', async (): Promise<void> => {
        const bus: LocalEventBus = new LocalEventBus();
        const seen: string[] = [];
        const listener = buildListener('a', seen);
        bus.subscribe('TestEvent', listener);
        await bus.publish(new TestEvent(1));
        expect(seen).toEqual(['a']);
    });

    it('Set-dedupes: the same handler registered twice is invoked ONCE per publish', async (): Promise<void> => {
        const bus: LocalEventBus = new LocalEventBus();
        const seen: string[] = [];
        const listener = buildListener('same', seen);
        bus.subscribe('TestEvent', listener);
        bus.subscribe('TestEvent', listener);
        await bus.publish(new TestEvent(2));
        expect(seen).toEqual(['same']);
    });

    it('listener rejection does NOT propagate to the publisher and other listeners still run', async (): Promise<void> => {
        const bus: LocalEventBus = new LocalEventBus();
        const seen: string[] = [];
        const errorSpy = jest.spyOn(console, 'error').mockImplementation((): void => undefined);
        try {
            bus.subscribe('TestEvent', failingListener());
            bus.subscribe('TestEvent', buildListener('after-failure', seen));
            // If publish propagated the rejection, this await would reject and fail the test.
            await bus.publish(new TestEvent(3));
            expect(seen).toEqual(['after-failure']);
            expect(errorSpy).toHaveBeenCalledWith('Event handler failed:', expect.any(Error));
        } finally {
            errorSpy.mockRestore();
        }
    });

    it('publish for an event type with no listeners is a no-op and resolves', async (): Promise<void> => {
        const bus: LocalEventBus = new LocalEventBus();
        await expect(bus.publish(new TestEvent(4))).resolves.toBeUndefined();
        // A different (unregistered) literal also never dispatches anything.
        await bus.publish(new class implements DomainEvent {
            public readonly type = 'OtherEvent' as const;
            public readonly occurredOn: Date = new Date();
        }());
    });

    it('multiple distinct listeners all run for one publish', async (): Promise<void> => {
        const bus: LocalEventBus = new LocalEventBus();
        const seen: string[] = [];
        bus.subscribe('TestEvent', buildListener('first', seen));
        bus.subscribe('TestEvent', buildListener('second', seen));
        await bus.publish(new TestEvent(5));
        expect(seen).toEqual(['first', 'second']);
    });

    it('publishes deliver the exact event instance (same reference) to the listener', async (): Promise<void> => {
        const bus: LocalEventBus = new LocalEventBus();
        const event = new TestEvent(42);
        let received: TestEvent | undefined;
        const listener: EventListener<TestEvent> = {
            handle: async (e: TestEvent): Promise<void> => {
                received = e;
            },
        };
        bus.subscribe('TestEvent', listener);
        await bus.publish(event);
        expect(received).toBe(event);
    });
});
