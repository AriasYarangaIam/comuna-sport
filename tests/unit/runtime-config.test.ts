/// <reference types="node" />
/// <reference types="jest" />

import { DEFAULT_PORT, resolvePort } from '../../src/infrastructure/config/runtime';

// Production hosts (Render, Railway, Fly) inject the port through the
// environment. `boot` reads it once; these cases pin the contract the deploy
// depends on: default when absent, the injected value when valid, and a loud
// failure when the value is unusable instead of a silent fallback that would
// leave the process listening where the platform does not route traffic.
describe('resolvePort', (): void => {
    it('defaults to 3000 when PORT is absent', (): void => {
        expect(resolvePort({})).toBe(DEFAULT_PORT);
        expect(DEFAULT_PORT).toBe(3000);
    });

    it('returns the injected port as a number', (): void => {
        expect(resolvePort({ PORT: '8080' })).toBe(8080);
        expect(resolvePort({ PORT: '10000' })).toBe(10000);
    });

    it('treats an empty or whitespace PORT as absent', (): void => {
        expect(resolvePort({ PORT: '' })).toBe(DEFAULT_PORT);
        expect(resolvePort({ PORT: '   ' })).toBe(DEFAULT_PORT);
    });

    it('rejects a non-numeric PORT', (): void => {
        expect((): number => resolvePort({ PORT: 'http' })).toThrow('PORT must be an integer between 1 and 65535: http');
        expect((): number => resolvePort({ PORT: '80.5' })).toThrow('PORT must be an integer between 1 and 65535: 80.5');
    });

    it('rejects an out-of-range PORT', (): void => {
        expect((): number => resolvePort({ PORT: '0' })).toThrow('PORT must be an integer between 1 and 65535: 0');
        expect((): number => resolvePort({ PORT: '65536' })).toThrow('PORT must be an integer between 1 and 65535: 65536');
        expect((): number => resolvePort({ PORT: '-3000' })).toThrow('PORT must be an integer between 1 and 65535: -3000');
    });
});
