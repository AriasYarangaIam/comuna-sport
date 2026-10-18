// TypeScript 6.0 changed compilerOptions `types` to default to `[]` — @types packages
// are no longer auto-discovered, and DEVELOPMENT.md §13's tsconfig.json specifies no
// `types` field (the file is locked for this task). This ambient directive loads the
// Node API declarations (@types/node: `randomUUID`, `process`, etc.) project-wide,
// which is what `"types": ["node"]` would otherwise do.
/// <reference types="node" />
