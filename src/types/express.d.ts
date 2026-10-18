// Module augmentation (DEVELOPMENT.md §11) — extends Express's Request with
// project-specific fields. Kept separate from src/types/node.d.ts (the ambient
// Node reference shim).
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

export {};
