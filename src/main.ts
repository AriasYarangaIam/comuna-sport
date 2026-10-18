import express, { Express, json, Router } from "express";
import cors from "cors";
import helmet from "helmet";
import { buildContainer, Container } from "./infrastructure/di/container";
import { errorHandler } from "./infrastructure/http/middleware/error-handler.middleware";
import { rateLimiter } from "./infrastructure/http/middleware/rate-limit.middleware";
import { requestLogger } from "./infrastructure/http/middleware/request-logger.middleware";

const PORT: number = 3000;

// §11 middleware order (Decorator pattern):
// helmet → cors → express.json → requestLogger → rateLimiter → routes → errorHandler LAST.
const createApp = (container: Container): Express => {
    const app: Express = express();

    app.use(helmet());
    app.use(cors());
    app.use(json());
    app.use(requestLogger);
    app.use(rateLimiter);
    app.use(container.resolve<Router>('reservationRoutes'));
    app.use(container.resolve<Router>('incidentRoutes'));
    app.use(errorHandler);

    return app;
};

const bootstrap = (): void => {
    const container: Container = buildContainer();
    const app: Express = createApp(container);
    app.listen(PORT, (): void => {
        console.log(`comuna-sport-api listening on http://localhost:${PORT}`);
    });
};

bootstrap();
