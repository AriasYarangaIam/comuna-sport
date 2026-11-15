import { timingSafeEqual } from "crypto";
import { Router } from "express";
import type { Request, RequestHandler, Response } from "express";

import { EntityNotFoundException } from "../../../domain/exceptions/entity-not-found.exception";
import type { IdempotencyStore } from "../../../application/ports/idempotency-store.interface";

// S3 (odd/tasks/deploy-hardening.md): the scheduled sweep. Vercel invokes a cron
// as `GET` on the configured path and, when `CRON_SECRET` is set on the project,
// sends `Authorization: Bearer <CRON_SECRET>`. Any scheduler that can send that
// header works too, so the route is not Vercel-specific.
export const SWEEP_SECRET_VARIABLE: string = 'CRON_SECRET';

const UNAUTHORIZED_BODY = {
    error: { code: 'UNAUTHORIZED', message: 'The sweep endpoint requires the configured bearer token.' },
};

const readSecret = (): string | undefined => {
    const raw: string | undefined = process.env[SWEEP_SECRET_VARIABLE];
    return raw === undefined || raw.trim() === '' ? undefined : raw;
};

// Constant-time comparison over equal-length buffers. Length is checked first
// because `timingSafeEqual` throws on a length mismatch, which would leak the
// expected length through a 500.
const matches = (presented: string, expected: string): boolean => {
    const a: Buffer = Buffer.from(presented, 'utf8');
    const b: Buffer = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) {
        return false;
    }
    return timingSafeEqual(a, b);
};

export const createInternalRoutes = (store: IdempotencyStore): Router => {
    const router: Router = Router();

    const sweep: RequestHandler = async (req: Request, res: Response): Promise<void> => {
        const secret: string | undefined = readSecret();

        // Unconfigured deployment: the path does not exist at all, so nothing is
        // exposed and a misconfigured scheduler fails loudly instead of sweeping.
        if (secret === undefined) {
            throw new EntityNotFoundException('Route not found.', 'SWEEP_DISABLED');
        }

        const header: string | undefined = req.headers.authorization;
        const prefix: string = 'Bearer ';
        if (header === undefined || !header.startsWith(prefix) || !matches(header.slice(prefix.length), secret)) {
            res.status(401).json(UNAUTHORIZED_BODY);
            return;
        }

        const swept: number = await store.sweepExpired();
        res.status(200).json({ swept: swept });
    };

    router.get('/internal/idempotency/sweep', sweep);
    return router;
};
