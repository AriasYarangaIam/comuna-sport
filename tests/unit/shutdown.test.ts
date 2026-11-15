/// <reference types="node" />
/// <reference types="jest" />

import { createShutdownHandler, ShutdownTarget } from '../../src/infrastructure/config/shutdown';

// S4 (odd/tasks/deploy-hardening.md): SIGTERM/SIGINT arrive asynchronously and
// can repeat, so the handler must be idempotent, must stop the listener before
// releasing the pool, and must still release the pool when the listener refuses
// to close. `exit` is injected so the contract is testable without killing Jest.
interface Probe {
    readonly target: ShutdownTarget;
    readonly events: string[];
    readonly exit: jest.Mock<void, [number]>;
}

const probe = (failures: { server?: Error; resources?: Error } = {}): Probe => {
    const events: string[] = [];
    const exit = jest.fn<void, [number]>();
    return {
        events: events,
        exit: exit,
        target: {
            closeServer: (): Promise<void> => {
                events.push('server');
                return failures.server === undefined
                    ? Promise.resolve()
                    : Promise.reject(failures.server);
            },
            closeResources: (): Promise<void> => {
                events.push('resources');
                return failures.resources === undefined
                    ? Promise.resolve()
                    : Promise.reject(failures.resources);
            },
        },
    };
};

describe('createShutdownHandler', (): void => {
    it('stops the listener before releasing the pool', async (): Promise<void> => {
        const p: Probe = probe();

        await createShutdownHandler(p.target, p.exit)();

        expect(p.events).toEqual(['server', 'resources']);
        expect(p.exit).toHaveBeenCalledWith(0);
    });

    it('runs once even when two signals arrive', async (): Promise<void> => {
        const p: Probe = probe();
        const shutdown = createShutdownHandler(p.target, p.exit);

        await Promise.all([shutdown(), shutdown()]);

        expect(p.events).toEqual(['server', 'resources']);
        expect(p.exit).toHaveBeenCalledTimes(1);
    });

    it('still releases the pool when the listener fails to close, and exits non-zero', async (): Promise<void> => {
        const p: Probe = probe({ server: new Error('listener already closed') });

        await createShutdownHandler(p.target, p.exit)();

        expect(p.events).toEqual(['server', 'resources']);
        expect(p.exit).toHaveBeenCalledWith(1);
    });

    it('exits non-zero when the pool cannot be released', async (): Promise<void> => {
        const p: Probe = probe({ resources: new Error('pool already ended') });

        await createShutdownHandler(p.target, p.exit)();

        expect(p.exit).toHaveBeenCalledWith(1);
    });
});
