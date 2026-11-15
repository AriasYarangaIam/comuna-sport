/// <reference types="node" />
/// <reference types="jest" />

import type { Pool } from 'pg';

import { buildContainer, Container } from '../../src/infrastructure/di/container';

// S4 (odd/tasks/deploy-hardening.md): `closePool` existed but only tests called
// it, so a deployed process left its PostgreSQL connections to be reaped by the
// platform. `Container.close()` is the single release point the shutdown path
// uses; it must be a no-op for the in-memory adapter and must not open a pool
// that was never used.
interface FakePool {
    end: jest.Mock<Promise<void>, []>;
}

const fakePool = (): FakePool => ({ end: jest.fn((): Promise<void> => Promise.resolve()) });

describe('Container.close', (): void => {
    it('resolves without touching anything when the in-memory adapter is wired', async (): Promise<void> => {
        const container: Container = buildContainer({ databaseUrl: '' });

        await expect(container.close()).resolves.toBeUndefined();
    });

    it('ends a pool that was actually created', async (): Promise<void> => {
        const container: Container = buildContainer({ databaseUrl: 'postgres://unused' });
        const pool: FakePool = fakePool();
        container.register<Pool>('pool', (): Pool => pool as unknown as Pool);
        container.resolve<Pool>('pool');

        await container.close();

        expect(pool.end).toHaveBeenCalledTimes(1);
    });

    it('does not create a pool just to close it', async (): Promise<void> => {
        const container: Container = buildContainer({ databaseUrl: 'postgres://unused' });
        const pool: FakePool = fakePool();
        const factory = jest.fn((): Pool => pool as unknown as Pool);
        container.register<Pool>('pool', factory);

        await container.close();

        expect(factory).not.toHaveBeenCalled();
        expect(pool.end).not.toHaveBeenCalled();
    });
});
