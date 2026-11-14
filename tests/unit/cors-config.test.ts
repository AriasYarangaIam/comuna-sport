/// <reference types="node" />
/// <reference types="jest" />

import { CORS_ORIGINS_ERROR, resolveCorsOptions } from '../../src/infrastructure/config/cors';

// S1 (odd/tasks/deploy-hardening.md): CORS is restricted by configuration. The
// demo deployment relies on the open default, so the contract has two halves:
// absent configuration must keep `cors()` untouched, and a malformed list must
// fail loudly instead of silently degrading to open CORS.
describe('resolveCorsOptions', (): void => {
    it('leaves the cors defaults untouched when the variable is absent', (): void => {
        expect(resolveCorsOptions({})).toBeUndefined();
    });

    it('treats a blank value as absent', (): void => {
        expect(resolveCorsOptions({ CORS_ALLOWED_ORIGINS: '' })).toBeUndefined();
        expect(resolveCorsOptions({ CORS_ALLOWED_ORIGINS: '   ' })).toBeUndefined();
    });

    it('restricts the allowed origins to the configured list', (): void => {
        expect(resolveCorsOptions({ CORS_ALLOWED_ORIGINS: 'https://web.example' })).toEqual({
            origin: ['https://web.example'],
        });
    });

    it('trims spaces and blank entries around a comma-separated list', (): void => {
        expect(
            resolveCorsOptions({ CORS_ALLOWED_ORIGINS: ' https://web.example , http://localhost:5173 ,' })
        ).toEqual({ origin: ['https://web.example', 'http://localhost:5173'] });
    });

    it('rejects an entry that is not an absolute origin', (): void => {
        expect((): unknown => resolveCorsOptions({ CORS_ALLOWED_ORIGINS: 'web.example' })).toThrow(
            CORS_ORIGINS_ERROR + 'web.example'
        );
        expect((): unknown =>
            resolveCorsOptions({ CORS_ALLOWED_ORIGINS: 'https://web.example, ftp://files.example' })
        ).toThrow(CORS_ORIGINS_ERROR + 'ftp://files.example');
    });

    it('rejects an origin carrying a path or a trailing slash', (): void => {
        expect((): unknown =>
            resolveCorsOptions({ CORS_ALLOWED_ORIGINS: 'https://web.example/api' })
        ).toThrow(CORS_ORIGINS_ERROR + 'https://web.example/api');
        expect((): unknown =>
            resolveCorsOptions({ CORS_ALLOWED_ORIGINS: 'https://web.example/' })
        ).toThrow(CORS_ORIGINS_ERROR + 'https://web.example/');
    });
});
