// Runtime configuration resolved once by the composition root at boot.
// The port is the only value a hosting platform must inject: Render, Railway
// and Fly all publish `PORT` and route traffic to it, so a hard-coded 3000
// would leave the deployed process listening where nothing is routed.

export const DEFAULT_PORT: number = 3000;

// Every supported host (Render, Railway, Fly, Vercel) puts exactly one reverse
// proxy in front of the process and forwards the client address in
// X-Forwarded-For. Express must trust that single hop so `req.ip` — the key the
// rate limiter uses — is the visitor, not the proxy, which would otherwise put
// every user in one shared 100-request bucket.
export const TRUST_PROXY_HOPS: number = 1;

const PORT_ERROR: string = 'PORT must be an integer between 1 and 65535: ';

export interface RuntimeEnvironment {
    readonly PORT?: string | undefined;
}

/**
 * Resolves the listening port from the process environment.
 *
 * An absent, empty or whitespace-only PORT falls back to the local default; a
 * present but unusable value throws so a misconfigured deployment fails at boot
 * instead of silently listening on the wrong port.
 */
export const resolvePort = (env: RuntimeEnvironment): number => {
    const raw: string | undefined = env.PORT;

    if (raw === undefined || raw.trim() === '') {
        return DEFAULT_PORT;
    }

    const trimmed: string = raw.trim();
    const parsed: number = Number(trimmed);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        throw new Error(PORT_ERROR + trimmed);
    }

    return parsed;
};
