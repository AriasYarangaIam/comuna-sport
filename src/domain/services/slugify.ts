// Public identifier for spaces (odd/tasks/privacy-identifiers-and-copy.md, S1):
// the slug replaces the UUID in every response and route. The same function is
// mirrored in SQL by `spaces_slug_from_name` in db/migrations/004_spaces_slug.sql
// — both must produce the same string for the same name, so the rules are kept
// deliberately simple: strip accents, lowercase, runs of non-alphanumerics →
// '-', trim leading/trailing '-'.
const stripAccents = (value: string): string => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const slugify = (value: string): string => stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
