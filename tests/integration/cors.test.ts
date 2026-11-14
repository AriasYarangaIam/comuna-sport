/// <reference types="node" />
/// <reference types="jest" />

import type { Express } from 'express';
import request from 'supertest';
import { buildContainer } from '../../src/infrastructure/di/container';
import { createApp } from '../../src/main';

// S1 (odd/tasks/deploy-hardening.md): the resolved policy has to reach the
// middleware stack. `createApp` reads the environment when it is called, so the
// three cases below choose the policy without touching the module import graph.
const ALLOWED: string = 'https://web.example';

const appWithCors = (value: string | undefined): Express => {
    if (value === undefined) {
        delete process.env['CORS_ALLOWED_ORIGINS'];
    } else {
        process.env['CORS_ALLOWED_ORIGINS'] = value;
    }
    return createApp(buildContainer({ databaseUrl: '' }));
};

const afterEachRestore = (): void => {
    delete process.env['CORS_ALLOWED_ORIGINS'];
};

describe('CORS policy on the deployed middleware stack', (): void => {
    afterEach(afterEachRestore);

    it('keeps the open demo default when CORS_ALLOWED_ORIGINS is unset', async (): Promise<void> => {
        const res = await request(appWithCors(undefined))
            .get('/spaces')
            .set('Origin', 'https://anywhere.example');

        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe('*');
    });

    it('reflects a configured origin and rejects any other one', async (): Promise<void> => {
        const allowed = await request(appWithCors(ALLOWED))
            .get('/spaces')
            .set('Origin', ALLOWED);
        expect(allowed.status).toBe(200);
        expect(allowed.headers['access-control-allow-origin']).toBe(ALLOWED);

        const rejected = await request(appWithCors(ALLOWED))
            .get('/spaces')
            .set('Origin', 'https://evil.example');
        expect(rejected.status).toBe(200);
        expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('fails at boot when a configured origin is malformed', (): void => {
        expect((): Express => appWithCors('https://web.example/')).toThrow(
            'CORS_ALLOWED_ORIGINS must be a comma-separated list of absolute origins (scheme://host[:port]): https://web.example/'
        );
    });
});
