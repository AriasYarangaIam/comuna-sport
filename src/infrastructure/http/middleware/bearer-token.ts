import { timingSafeEqual } from "crypto";

// Shared bearer-token primitives for the scheduler and municipal-management
// routes. Both endpoints compare an opaque secret and must not leak its length,
// so the comparison lives in exactly one place.

export const readSecret = (variable: string): string | undefined => {
    const raw: string | undefined = process.env[variable];
    return raw === undefined || raw.trim() === '' ? undefined : raw;
};

// Constant-time comparison over equal-length buffers. Length is checked first
// because `timingSafeEqual` throws on a length mismatch, which would leak the
// expected length through a 500.
export const matchesToken = (presented: string, expected: string): boolean => {
    const a: Buffer = Buffer.from(presented, 'utf8');
    const b: Buffer = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) {
        return false;
    }
    return timingSafeEqual(a, b);
};

export const BEARER_PREFIX = 'Bearer ';

export const presentedBearer = (header: string | undefined): string | null => {
    if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
        return null;
    }
    return header.slice(BEARER_PREFIX.length);
};
