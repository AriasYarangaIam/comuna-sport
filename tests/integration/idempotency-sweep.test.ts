/// <reference types="node" />
/// <reference types="jest" />

import type { Express } from 'express';
import request from 'supertest';

import { buildContainer } from '../../src/infrastructure/di/container';
import { createApp } from '../../src/main';
import {
    IDEMPOTENCY_TTL_MS,
    InMemoryIdempotencyStore,
    getIdempotencyStore,
} from '../../src/infrastructure/persistence/in-memory/idempotency.in-memory.store';

// S3 (odd/tasks/deploy-hardening.md): the 24 h idempotency TTL only means
// something if something actually deletes the expired rows. `pnpm db:sweep`
// clears them by hand; this endpoint is what a scheduler calls. Vercel invokes
// crons as `GET` with `Authorization: Bearer $CRON_SECRET`, so the contract
// below is: no secret configured → the path is not routable, wrong token → 401,
// right token → 200 with the number of removed keys.
const CRON_SECRET: string = 'test-cron-secret';
const SWEEP_PATH: string = '/internal/idempotency/sweep';

const appWithSecret = (secret: string | undefined): Express => {
    if (secret === undefined) {
        delete process.env['CRON_SECRET'];
    } else {
        process.env['CRON_SECRET'] = secret;
    }
    return createApp(buildContainer({ databaseUrl: '' }));
};

// Fake ONLY the clock (same recipe as the idempotency middleware suite) so the
// TTL can be crossed without breaking supertest's timers.
const dateOnlyClock = (now: number): FakeTimersConfig => ({
    now: now,
    doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
    ],
});

describe(`GET ${SWEEP_PATH}`, (): void => {
    afterEach((): void => {
        delete process.env['CRON_SECRET'];
        jest.useRealTimers();
    });

    it('is not routable while CRON_SECRET is unset', async (): Promise<void> => {
        const res = await request(appWithSecret(undefined))
            .get(SWEEP_PATH)
            .set('Authorization', `Bearer ${CRON_SECRET}`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('SWEEP_DISABLED');
    });

    it('rejects a request without the bearer token', async (): Promise<void> => {
        const res = await request(appWithSecret(CRON_SECRET)).get(SWEEP_PATH);

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects a wrong or truncated bearer token', async (): Promise<void> => {
        const wrong = await request(appWithSecret(CRON_SECRET))
            .get(SWEEP_PATH)
            .set('Authorization', 'Bearer not-the-secret');
        const truncated = await request(appWithSecret(CRON_SECRET))
            .get(SWEEP_PATH)
            .set('Authorization', `Bearer ${CRON_SECRET.slice(0, -1)}`);

        expect(wrong.status).toBe(401);
        expect(truncated.status).toBe(401);
    });

    it('sweeps and reports how many keys it removed', async (): Promise<void> => {
        const res = await request(appWithSecret(CRON_SECRET))
            .get(SWEEP_PATH)
            .set('Authorization', `Bearer ${CRON_SECRET}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ swept: 0 });
    });
});

describe('InMemoryIdempotencyStore.sweepExpired', (): void => {
    it('removes claims older than the TTL and keeps the fresh ones', async (): Promise<void> => {
        jest.useFakeTimers(dateOnlyClock(Date.parse('2026-11-14T00:00:00.000Z')));
        const store: InMemoryIdempotencyStore = new InMemoryIdempotencyStore();
        const staleKey: string = 'sweep-stale-key';
        const freshKey: string = 'sweep-fresh-key';

        await store.claim(staleKey, 'hash-stale');
        jest.setSystemTime(Date.now() + IDEMPOTENCY_TTL_MS + 1000);
        await store.claim(freshKey, 'hash-fresh');

        const swept: number = await store.sweepExpired();

        expect(swept).toBe(1);
        expect(getIdempotencyStore().has(staleKey)).toBe(false);
        expect(getIdempotencyStore().has(freshKey)).toBe(true);
    });

    it('reports zero when nothing is expired', async (): Promise<void> => {
        const store: InMemoryIdempotencyStore = new InMemoryIdempotencyStore();

        await expect(store.sweepExpired()).resolves.toBe(0);
    });
});
