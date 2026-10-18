import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

// Logs method + path and tags every request with a `requestId` (honours an
// incoming x-request-id header, otherwise generates one). Consumed through the
// module augmentation in src/types/express.d.ts.
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const incomingId: string | string[] | undefined = req.headers['x-request-id'];
    const incomingRequestId: string | undefined = Array.isArray(incomingId) ? incomingId[0] : incomingId;

    if (incomingRequestId !== undefined) {
        req.requestId = incomingRequestId;
    } else {
        req.requestId = randomUUID();
    }

    const startedAt: number = Date.now();

    res.on('finish', (): void => {
        const durationMs: number = Date.now() - startedAt;
        console.log(`[${req.method} ${req.originalUrl}] ${res.statusCode} ${durationMs}ms requestId=${req.requestId}`);
    });

    next();
};
