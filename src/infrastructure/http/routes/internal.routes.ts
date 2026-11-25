import { timingSafeEqual } from "crypto";
import { Router } from "express";
import type { Request, RequestHandler, Response } from "express";

import { EntityNotFoundException } from "../../../domain/exceptions/entity-not-found.exception";
import type { IdempotencyStore } from "../../../application/ports/idempotency-store.interface";
import type { CatalogMaintenance } from "../../../application/ports/catalog-maintenance.interface";
import { matchesToken, presentedBearer, readSecret } from "../middleware/bearer-token";

// S3 (odd/tasks/deploy-hardening.md): the scheduled sweep. Vercel invokes a cron
// as `GET` on the configured path and, when `CRON_SECRET` is set on the project,
// sends `Authorization: Bearer <CRON_SECRET>`. Any scheduler that can send that
// header works too, so the route is not Vercel-specific.
export const SWEEP_SECRET_VARIABLE: string = 'CRON_SECRET';

const UNAUTHORIZED_BODY = {
    error: { code: 'UNAUTHORIZED', message: 'The sweep endpoint requires the configured bearer token.' },
};

// S3 (odd/tasks/demo-completion.md): the catalog horizon is materialised, so the
// same scheduler keeps it rolling instead of letting availability expire.
const CATALOG_UNAUTHORIZED_BODY = {
    error: { code: 'UNAUTHORIZED', message: 'The catalog refresh endpoint requires the configured bearer token.' },
};

const requireSecret = (req: Request, res: Response, unauthorizedBody: unknown): string | null => {
    const secret: string | undefined = readSecret(SWEEP_SECRET_VARIABLE);

    // Unconfigured deployment: the path does not exist at all, so nothing is
    // exposed and a misconfigured scheduler fails loudly instead of running.
    if (secret === undefined) {
        throw new EntityNotFoundException('Route not found.', 'SWEEP_DISABLED');
    }

    const presented: string | null = presentedBearer(req.headers.authorization);
    if (presented === null || !matchesToken(presented, secret)) {
        res.status(401).json(unauthorizedBody);
        return null;
    }

    return secret;
};

export const createInternalRoutes = (store: IdempotencyStore, catalog: CatalogMaintenance): Router => {
    const router: Router = Router();

    const sweep: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        if (requireSecret(req, res, UNAUTHORIZED_BODY) === null) {
            return;
        }

        const swept: number = await store.sweepExpired();
        res.status(200).json({ swept: swept });
    };

    const refreshCatalog: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        if (requireSecret(req, res, CATALOG_UNAUTHORIZED_BODY) === null) {
            return;
        }

        const extended: number = await catalog.refreshHorizon();
        res.status(200).json({ extended: extended });
    };

    router.get('/internal/idempotency/sweep', sweep);
    router.get('/internal/catalog/refresh', refreshCatalog);
    return router;
};

// Re-exported for the guard tests that assert constant-time comparison semantics.
export const __testing = { timingSafeEqual };
