import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

const RATE_LIMIT_WINDOW_MS: number = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS: number = 100;

export const rateLimiter: RequestHandler = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // Errors keep the single APIError shape (Appendix B).
    message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } }
});
