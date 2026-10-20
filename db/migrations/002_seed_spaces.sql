-- Target-state seed from DATABASE.md §8. Mirrors the 4 v1 in-memory spaces
-- (src/infrastructure/persistence/in-memory/space.in-memory.repository.ts) so the
-- PostgreSQL adapter serves the same catalog the API served in memory.
INSERT INTO spaces (id, name, type, capacity, base_price, currency, is_active) VALUES
    ('11111111-1111-4111-8111-111111111111', 'Cancha de Veteranos Miraflores', 'CANCHA_FUTBOL',   22, 100.00, 'PEN', true),
    ('22222222-2222-4222-8222-222222222222', 'Losas Comunitarias Barranco',   'LOSA_BASQUET',    10,  40.00, 'PEN', true),
    ('33333333-3333-4333-8333-333333333333', 'Pista Comunal Barranco',        'PISTA_TENIS',      4,  50.50, 'PEN', true),
    ('44444444-4444-4444-8444-444444444444', 'Multiusos San Isidro',          'MULTIPROPOSITO',  50, 150.00, 'PEN', true)
ON CONFLICT (id) DO UPDATE SET
    name       = EXCLUDED.name,
    type       = EXCLUDED.type,
    capacity   = EXCLUDED.capacity,
    base_price = EXCLUDED.base_price,
    currency   = EXCLUDED.currency,
    is_active  = EXCLUDED.is_active;

-- One availability window per space per day, for today + the next 29 days (30 total),
-- expressed as Lima wall-clock times. The generated day comes from the server clock
-- (UTC in the official image) and is combined with the Lima-local start/end time, then
-- converted to timestamptz — every row therefore lands on a single Lima calendar day,
-- satisfying the space_availability_windows same-day CHECK.
-- The id derives from (space_id, day) so re-running the seed is a no-op that
-- still REFRESHES the catalog (a deactivated space is reactivated, the price and
-- the window bounds are restored).
--
-- The seed OWNS the reference catalog: it replaces the availability windows of
-- the four reference spaces before inserting them. A SpaceWriter.save() rewrites
-- those windows with fresh surrogate ids, so an id-based upsert alone would
-- insert a SECOND copy of every window and violate the windows_no_overlap
-- EXCLUDE constraint. Replace-then-insert keeps the seed idempotent and
-- restores the catalog after any drift.
DELETE FROM space_availability_windows
WHERE space_id IN (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444'
);

INSERT INTO space_availability_windows (id, space_id, window_start, window_end)
SELECT
    md5(s.id::text || day::text)::uuid,
    s.id,
    (day::date + s.start_time) AT TIME ZONE 'America/Lima',
    (day::date + s.end_time)   AT TIME ZONE 'America/Lima'
FROM (
    VALUES
        ('11111111-1111-4111-8111-111111111111'::uuid, TIME '08:00', TIME '22:00'),
        ('22222222-2222-4222-8222-222222222222'::uuid, TIME '07:00', TIME '21:00'),
        ('33333333-3333-4333-8333-333333333333'::uuid, TIME '09:00', TIME '23:00'),
        ('44444444-4444-4444-8444-444444444444'::uuid, TIME '06:00', TIME '23:00')
) AS s (id, start_time, end_time)
CROSS JOIN generate_series(current_date, current_date + 29, interval '1 day') AS days (day)
ON CONFLICT (id) DO UPDATE SET
    window_start = EXCLUDED.window_start,
    window_end   = EXCLUDED.window_end;
