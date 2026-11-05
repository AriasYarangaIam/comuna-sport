/// <reference types="node" />
/// <reference types="jest" />

import type { Express, Request, Response } from 'express';
import request from 'supertest';
import { buildContainer } from '../../src/infrastructure/di/container';
import { createApp } from '../../src/main';

// Production hosts (Render, Railway, Fly, Vercel) terminate TLS and forward the
// client address in X-Forwarded-For. Two facts matter for the deployed API:
// Express must trust exactly one proxy hop — otherwise every visitor shares the
// proxy's single rate-limit bucket — and a forwarded request must be served
// normally, not fail validation.
describe('proxy headers behind a hosting platform', (): void => {
    let app: Express;

    beforeAll((): void => {
        app = createApp(buildContainer({ databaseUrl: '' }));
        // Probe route appended after the production middleware stack: it reports
        // the address Express resolved, which is the key the rate limiter uses.
        app.get('/__ip', (req: Request, res: Response): void => {
            res.json({ ip: req.ip });
        });
    });

    it('trusts exactly one proxy hop', (): void => {
        expect(app.get('trust proxy')).toBe(1);
    });

    it('resolves the client address from X-Forwarded-For', async (): Promise<void> => {
        const res = await request(app).get('/__ip').set('X-Forwarded-For', '203.0.113.7');

        expect(res.status).toBe(200);
        expect(res.body.ip).toBe('203.0.113.7');
    });

    it('serves a forwarded request with the rate-limit policy headers', async (): Promise<void> => {
        const res = await request(app)
            .get('/spaces')
            .set('X-Forwarded-For', '203.0.113.7')
            .set('X-Forwarded-Proto', 'https');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        // draft-8 emits RateLimit-Policy with the quota (q) and window (w).
        expect(String(res.headers['ratelimit-policy'])).toContain('q=100');
    });

    it('gives two distinct clients their own bucket', async (): Promise<void> => {
        const remaining = (res: request.Response): number => {
            const match: RegExpExecArray | null = /r=(\d+)/.exec(String(res.headers['ratelimit']));
            if (match === null) {
                throw new Error(`missing RateLimit header: ${String(res.headers['ratelimit'])}`);
            }
            return Number(match[1]);
        };

        await request(app).get('/spaces').set('X-Forwarded-For', '198.51.100.10');
        const first = await request(app).get('/spaces').set('X-Forwarded-For', '198.51.100.10');
        const second = await request(app).get('/spaces').set('X-Forwarded-For', '198.51.100.11');

        // The same client spends quota (r decreases); a different client starts
        // from the full quota, which is only true when the forwarded address is
        // the rate-limit key instead of the shared proxy address.
        expect(remaining(first)).toBe(98);
        expect(remaining(second)).toBe(99);
    });
});
