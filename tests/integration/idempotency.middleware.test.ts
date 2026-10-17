/// <reference types="node" />
/// <reference types="jest" />

import express, { Express, json } from "express";
import { randomUUID } from "crypto";
import request from "supertest";
import type { Response as SuperTestResponse } from "supertest";

import { idempotencyGuard, IDEMPOTENCY_TTL_MS } from "../../src/infrastructure/http/middleware/idempotency.middleware";

// Fake ONLY the clock — never network/scheduling timers, so supertest keeps
// working unmodified. `@types/jest@30` exposes `doNotFake` (there is no
// positive `toFake`), so we exclude every other fakeable API and keep `Date`.
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

interface Probe {
    readonly app: Express;
    readonly calls: () => number;
}

// Mounts the guard on a probe route with its own Express instance — isolated
// middleware tests (express-ts convention). The module-level idempotency store
// is shared, so every test uses a unique randomUUID key; that keeps the store
// state deterministic per case.
const buildProbe = (delayMs: number = 0): Probe => {
    let handlerCalls = 0;
    const app: Express = express();
    app.use(json());
    app.post('/probe', idempotencyGuard, async (_req, res): Promise<void> => {
        handlerCalls += 1;
        if (delayMs > 0) {
            await new Promise((resolve): void => { setTimeout(resolve, delayMs); });
        }
        res.status(201).json({ ok: true, calls: handlerCalls });
    });
    return { app: app, calls: (): number => handlerCalls };
};

describe('D4 idempotency middleware (isolated)', (): void => {
    afterEach((): void => {
        jest.useRealTimers();
    });

    it('rejects with 400 MISSING_IDEMPOTENCY_KEY when the header is absent', async (): Promise<void> => {
        const probe = buildProbe();
        const res = await request(probe.app).post('/probe').send({ a: 1 });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: { code: 'MISSING_IDEMPOTENCY_KEY', message: expect.any(String) } });
        expect(probe.calls()).toBe(0);
    });

    it('rejects with 400 when the header is an empty string', async (): Promise<void> => {
        const probe = buildProbe();
        const res = await request(probe.app).post('/probe').set('idempotency-key', '').send({ a: 1 });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('MISSING_IDEMPOTENCY_KEY');
        expect(probe.calls()).toBe(0);
    });

    it('same key + same payload: handler executes once, 201 returned', async (): Promise<void> => {
        const probe = buildProbe();
        const key: string = randomUUID();
        const res = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ ok: true, calls: 1 });
        expect(probe.calls()).toBe(1);
    });

    it('replay: a completed key re-runs NO handler and returns the cached body', async (): Promise<void> => {
        const probe = buildProbe();
        const key: string = randomUUID();
        const first = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        const second = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(second.status).toBe(first.status);
        expect(second.body).toEqual(first.body); // cached DTO replay
        expect(second.body).toEqual({ ok: true, calls: 1 });
        expect(probe.calls()).toBe(1); // handler was NOT called again
        // The replayed status is the CACHED status (201), with the cached body.
        expect(second.headers['content-type']).toMatch(/json/);
    });

    it('a second request while the first is in flight → 409 with reason in_flight', async (): Promise<void> => {
        // Deterministic sequencing with REAL timers. supertest starts a request
        // lazily (when awaited), so the FIRST request is kicked off explicitly
        // with `.end()`; its probe handler sleeps 80ms, keeping its claim
        // in_flight when the second request hits the guard ~20ms later.
        const probe = buildProbe(80);
        const key: string = randomUUID();
        const firstPromise: Promise<SuperTestResponse> = new Promise<SuperTestResponse>((resolve): void => {
            request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 }).end((err, res): void => {
                resolve(res);
                void err;
            });
        });
        await new Promise((resolve): void => { setTimeout(resolve, 20); });
        const second = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(second.status).toBe(409);
        expect(second.body).toEqual({
            error: {
                code: 'IDEMPOTENCY_CONFLICT',
                message: expect.any(String),
                details: { key: key, reason: 'in_flight' },
            },
        });
        const first: SuperTestResponse = await firstPromise;
        expect(first.status).toBe(201);
        expect(probe.calls()).toBe(1);
        // Once the flight completed, the SAME key replays the cached result.
        const replay = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(replay.status).toBe(201);
        expect(replay.body).toEqual(first.body);
        expect(probe.calls()).toBe(1);
    });

    it('same key, different payload → 422 with reason payload_mismatch', async (): Promise<void> => {
        const probe = buildProbe();
        const key: string = randomUUID();
        await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        const mismatch = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 2 });
        expect(mismatch.status).toBe(422);
        expect(mismatch.body).toEqual({
            error: {
                code: 'IDEMPOTENCY_CONFLICT',
                message: expect.any(String),
                details: { key: key, reason: 'payload_mismatch' },
            },
        });
        expect(probe.calls()).toBe(1);
    });

    it('only 2xx responses are cached: a non-2xx first response leaves the claim in_flight (never replayed)', async (): Promise<void> => {
        // The guard claims the key BEFORE the handler runs; only a 2xx send
        // transitions the record to completed. A non-2xx response is NOT
        // cached, so a retry is NOT served the failed body — instead it hits
        // the still-open in_flight claim (409). This is the implemented D4
        // behavior; the in_flight record expires via the 24h TTL.
        let handlerCalls = 0;
        const app: Express = express();
        app.use(json());
        app.post('/probe', idempotencyGuard, (_req, res): void => {
            handlerCalls += 1;
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } });
        });
        const key: string = randomUUID();
        const first = await request(app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(first.status).toBe(500);
        const retry = await request(app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(retry.status).toBe(409);
        expect(retry.status).not.toBe(first.status); // the 500 was NOT replayed
        expect(retry.body).not.toEqual(first.body);
        expect(retry.body.error).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT', details: { reason: 'in_flight' } });
        expect(handlerCalls).toBe(1);
    });

    it('a key past the TTL is claimable again (Date-only fake clock, deterministic)', async (): Promise<void> => {
        // Fake ONLY the clock — never network/scheduling timers, so supertest
        // keeps working unmodified.
        const t0: number = 1_000_000;
        jest.useFakeTimers(dateOnlyClock(t0)); // Date-only fake clock, deterministic
        const probe = buildProbe();
        const key: string = randomUUID();
        const first = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(first.status).toBe(201);
        expect(probe.calls()).toBe(1);

        jest.setSystemTime(t0 + IDEMPOTENCY_TTL_MS + 1); // past TTL → stale = absent

        const second = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(second.status).toBe(201);
        expect(second.body).toEqual({ ok: true, calls: 2 });
        expect(probe.calls()).toBe(2); // handler claimed the key again
    });

    it('a key WITHIN the TTL keeps replaying after the clock moves', async (): Promise<void> => {
        const t0: number = 2_000_000;
        jest.useFakeTimers(dateOnlyClock(t0)); // Date-only fake clock, deterministic
        const probe = buildProbe();
        const key: string = randomUUID();
        await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        jest.setSystemTime(t0 + IDEMPOTENCY_TTL_MS - 60_000); // still fresh
        const replay = await request(probe.app).post('/probe').set('idempotency-key', key).send({ a: 1 });
        expect(replay.status).toBe(201);
        expect(probe.calls()).toBe(1);
    });
});
