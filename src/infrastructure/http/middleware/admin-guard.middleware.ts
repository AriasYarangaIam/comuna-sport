import type { NextFunction, Request, RequestHandler, Response } from "express";

import { EntityNotFoundException } from "../../../domain/exceptions/entity-not-found.exception";
import { matchesToken, presentedBearer, readSecret } from "./bearer-token";

// S1 (odd/tasks/demo-completion.md): moving an incident through its lifecycle is
// a municipal action, not a citizen one. There is no user system in this scope,
// so the management surface is protected by a bearer token instead of inventing
// accounts and roles. With ADMIN_TOKEN unset the route does not exist at all —
// an unconfigured deployment exposes nothing.
export const ADMIN_TOKEN_VARIABLE: string = 'ADMIN_TOKEN';

const UNAUTHORIZED_BODY = {
    error: {
        code: 'UNAUTHORIZED',
        message: 'The municipal management endpoint requires the configured bearer token.'
    }
};

export const createAdminGuard = (): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const secret: string | undefined = readSecret(ADMIN_TOKEN_VARIABLE);

        if (secret === undefined) {
            // Unroutable: same shape the sweep endpoint uses when it is disabled.
            next(new EntityNotFoundException('Route not found.', 'ADMIN_DISABLED'));
            return;
        }

        const presented: string | null = presentedBearer(req.headers.authorization);
        if (presented === null || !matchesToken(presented, secret)) {
            res.status(401).json(UNAUTHORIZED_BODY);
            return;
        }

        next();
    };
};
