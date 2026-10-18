// cors@2.8.6 ships no type declarations and package.json is locked for this
// task (same situation as the `types: []` TS 6.0 shim in node.d.ts — add
// @types/cors on the next tooling change instead).
declare module 'cors' {
    import type { RequestHandler } from 'express';

    const cors: (options?: Record<string, unknown>) => RequestHandler;
    export default cors;
}
