-- 004_spaces_slug.sql — public slug for spaces
-- (odd/tasks/privacy-identifiers-and-copy.md, S5 — forward-only, additive).
--
-- 001–003 are never rewritten. This migration adds `spaces.slug`, backfills it
-- from the existing name, and keeps the column maintained for every future
-- write: `db/seed` upserts by id (`ON CONFLICT (id) DO UPDATE`) and never sets
-- the slug, so a BEFORE INSERT OR UPDATE trigger owns the derivation.
--
-- The SQL derivation mirrors `slugify` in src/domain/services/slugify.ts —
-- both must produce the same string for the same name: strip accents,
-- lowercase, runs of non-alphanumerics -> '-', trim '-'.

CREATE OR REPLACE FUNCTION spaces_slug_from_name(name TEXT) RETURNS TEXT AS $$
    SELECT trim(both '-' from regexp_replace(
        lower(translate(
            name,
            'ÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÄËÏÖÜäëïöüÇç',
            'AEIOUNaeiounAEEIOUaeeiouAEIOUaeiouAEIOUaeiouCc'
        )),
        '[^a-z0-9]+',
        '-',
        'g'
    ));
$$ LANGUAGE sql IMMUTABLE;

-- Additive column + backfill for the rows that exist today.
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE spaces SET slug = spaces_slug_from_name(name)
WHERE slug IS NULL;

ALTER TABLE spaces ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS spaces_slug_key ON spaces (slug);

-- Future inserts/updates (seed upserts included) keep the slug in sync with
-- the name. Recomputing on every write is idempotent: the slug is a pure
-- function of the name.
CREATE OR REPLACE FUNCTION spaces_set_slug() RETURNS trigger AS $$
BEGIN
    NEW.slug := spaces_slug_from_name(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spaces_slug_trigger ON spaces;
CREATE TRIGGER spaces_slug_trigger BEFORE INSERT OR UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION spaces_set_slug();
