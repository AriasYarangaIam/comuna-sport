import type { CorsOptions } from "cors";

// S1 (odd/tasks/deploy-hardening.md): CORS is a deployment decision, not a code
// change. `DEPLOYMENT.md` documents the open default for the demo ("the SPA and
// the API are different origins"), so an unconfigured process must keep exactly
// that behaviour; once `CORS_ALLOWED_ORIGINS` is set the list becomes the whole
// allowlist and a malformed entry throws at boot rather than falling back to
// open CORS.

export const CORS_ORIGINS_ERROR: string =
    'CORS_ALLOWED_ORIGINS must be a comma-separated list of absolute origins (scheme://host[:port]): ';

// An origin is scheme + host + optional port. Paths, trailing slashes and
// wildcards are rejected on purpose: the `cors` package compares the request
// `Origin` header verbatim, so "https://app.example/" would never match the
// browser's "https://app.example" and the misconfiguration would look like the
// API rejecting a legitimate frontend.
const ORIGIN_PATTERN: RegExp = /^https?:\/\/[^/\s]+$/;

export interface CorsEnvironment {
    readonly CORS_ALLOWED_ORIGINS?: string | undefined;
}

/**
 * Resolves the CORS policy from the process environment.
 *
 * Returns `undefined` when the variable is absent or blank, which is what makes
 * `cors(undefined)` behave exactly like today's `cors()` call. Any configured
 * entry that is not an absolute origin throws so a bad deploy fails at boot.
 */
export const resolveCorsOptions = (env: CorsEnvironment): CorsOptions | undefined => {
    const raw: string | undefined = env.CORS_ALLOWED_ORIGINS;

    if (raw === undefined || raw.trim() === '') {
        return undefined;
    }

    const origins: string[] = raw
        .split(',')
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry !== '');

    for (const origin of origins) {
        if (!ORIGIN_PATTERN.test(origin)) {
            throw new Error(CORS_ORIGINS_ERROR + origin);
        }
    }

    return { origin: origins };
};
