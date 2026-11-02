-- 003_tighten_incidents.sql
--
-- What: tightens the incidents table — reporter_id, description and state become
-- NOT NULL. The CHECK constraints that 001_schema.sql placed on those columns are
-- preserved untouched; only nullability changes.
--
-- Why: closes DATABASE.md §10 drift row 6. The §5 DDL shipped in 001_schema.sql
-- left the three columns nullable, but the domain requires every incident to carry
-- a reporter, a description and a state, so the columns must never be NULL.
--
-- Convergence: forward-only and idempotent, per DATABASE.md §8 ("Plain numbered
-- forward-only SQL files: db/migrations/NNN_description.sql"). A fresh database
-- (001 then 003) and an existing one (001 already applied, 003 applied now) end on
-- the same final schema, and re-running this file against an already-tight table
-- is a no-op that succeeds: each SET NOT NULL runs only while information_schema
-- still reports the column nullable.
--
-- Safety: this migration never deletes, updates or rewrites any row. If the table
-- already holds rows with a NULL in any of the three columns, it refuses before
-- altering anything and raises an error naming the offending row count, so no data
-- is ever silently dropped. The check and the ALTERs live in this single DO
-- statement, which db/migrate.js executes inside its per-file transaction, so the
-- guard and the tightening are one atomic step.
DO $$
DECLARE
    offending BIGINT;
BEGIN
    SELECT count(*)
      INTO offending
      FROM incidents
     WHERE reporter_id IS NULL
        OR description IS NULL
        OR state IS NULL;

    IF offending > 0 THEN
        RAISE EXCEPTION '003_tighten_incidents: refusing to SET NOT NULL — incidents holds % row(s) with NULL in reporter_id, description or state; repair those rows and re-run',
            offending;
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name   = 'incidents'
           AND column_name  = 'reporter_id'
           AND is_nullable  = 'YES'
    ) THEN
        EXECUTE 'ALTER TABLE incidents ALTER COLUMN reporter_id SET NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name   = 'incidents'
           AND column_name  = 'description'
           AND is_nullable  = 'YES'
    ) THEN
        EXECUTE 'ALTER TABLE incidents ALTER COLUMN description SET NOT NULL';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND table_name   = 'incidents'
           AND column_name  = 'state'
           AND is_nullable  = 'YES'
    ) THEN
        EXECUTE 'ALTER TABLE incidents ALTER COLUMN state SET NOT NULL';
    END IF;
END $$;
