import express, { Express, json, Router } from "express";
import type { Server } from "http";
import cors from "cors";
import helmet from "helmet";
import { buildContainer, Container } from "./infrastructure/di/container";
import { errorHandler } from "./infrastructure/http/middleware/error-handler.middleware";
import { rateLimiter } from "./infrastructure/http/middleware/rate-limit.middleware";
import { requestLogger } from "./infrastructure/http/middleware/request-logger.middleware";
import { resolveCorsOptions } from "./infrastructure/config/cors";
import { createShutdownHandler } from "./infrastructure/config/shutdown";
import { resolvePort, TRUST_PROXY_HOPS } from "./infrastructure/config/runtime";

// §11 middleware order (Decorator pattern):
// helmet → cors → express.json → requestLogger → rateLimiter → routes → errorHandler LAST.
// Exported so supertest e2e tests (T21) can build the app without listening.
export const createApp = (container: Container): Express => {
    const app: Express = express();

    // One trusted proxy hop: the hosting platform's edge. Without it every
    // visitor behind the edge shares a single rate-limit bucket.
    app.set('trust proxy', TRUST_PROXY_HOPS);

    app.use(helmet());
    // S1: unset leaves the open demo default; a configured list becomes the
    // whole allowlist and a malformed entry throws here, at boot.
    app.use(cors(resolveCorsOptions(process.env)));
    app.use(json());
    app.use(requestLogger);
    app.use(rateLimiter);
    app.use(container.resolve<Router>('internalRoutes'));
    app.use(container.resolve<Router>('spaceRoutes'));
    app.use(container.resolve<Router>('reservationRoutes'));
    app.use(container.resolve<Router>('incidentRoutes'));
    app.use(errorHandler);

    return app;
};

const bootstrap = (): void => {
    // Loaded here (never at module top level) so importing `createApp` from
    // tests never touches the filesystem or the process environment.
    try {
        process.loadEnvFile();
    } catch {
        // no .env file — configuration comes from the environment
    }
    const container: Container = buildContainer();
    const app: Express = createApp(container);
    const port: number = resolvePort(process.env);
    const server: Server = app.listen(port, (): void => {
        console.log(`comuna-sport-api listening on http://localhost:${port}`);
    });

    // S4: a deployed process is asked to stop with a signal. Stop accepting new
    // connections first, then release the PostgreSQL pool (closePool used to be
    // test-only, so connections were left to the platform to reap).
    const shutdown = createShutdownHandler(
        {
            closeServer: (): Promise<void> => new Promise<void>((resolve: () => void): void => {
                server.close((): void => resolve());
            }),
            closeResources: (): Promise<void> => container.close(),
        },
        (code: number): void => {
            process.exit(code);
        }
    );

    for (const signal of ['SIGTERM', 'SIGINT'] as const) {
        process.once(signal, (): void => {
            void shutdown();
        });
    }
};

// §11 bootstrap runs ONLY when this module is the process entry point
// (node dist/main.js); imported by tests, the Express app builds without an
// open port.
if (require.main === module) {
    bootstrap();
}
