-- Target-state DDL from DATABASE.md §5. No database existed in v1; this file is the
-- forward-only schema baseline that the PostgreSQL adapter targets.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Target-state DDL from DATABASE.md §5 — spaces
CREATE TABLE spaces (
    id          UUID PRIMARY KEY,
    name        TEXT CHECK (char_length(name) BETWEEN 1 AND 200),
    type        TEXT CHECK (type IN ('CANCHA_FUTBOL','LOSA_BASQUET','PISTA_TENIS','MULTIPROPOSITO')),
    capacity    INT CHECK (capacity > 0),
    base_price  NUMERIC(12,2) CHECK (base_price >= 0),
    currency    CHAR(3) CHECK (currency = 'PEN'),
    is_active   BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX spaces_is_active_idx ON spaces (is_active) WHERE is_active;

-- Target-state DDL from DATABASE.md §5 — space_availability_windows
CREATE TABLE space_availability_windows (
    id            UUID PRIMARY KEY,
    space_id      UUID NOT NULL REFERENCES spaces (id),
    window_start  TIMESTAMPTZ NOT NULL,
    window_end    TIMESTAMPTZ NOT NULL,
    CHECK (window_end > window_start),
    CHECK ((window_start AT TIME ZONE 'America/Lima')::date = (window_end AT TIME ZONE 'America/Lima')::date),
    CONSTRAINT windows_no_overlap EXCLUDE USING gist
        (space_id WITH =, tstzrange(window_start, window_end) WITH &&)
);
CREATE INDEX windows_slot_idx ON space_availability_windows (window_start, window_end);

-- Target-state DDL from DATABASE.md §5 — reservations
CREATE TABLE reservations (
    id          UUID PRIMARY KEY,
    space_id    UUID NOT NULL REFERENCES spaces (id),
    user_id     TEXT NOT NULL CHECK (char_length(user_id) > 0),
    time_slot   tstzrange NOT NULL,
    amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency    CHAR(3) NOT NULL CHECK (currency = 'PEN'),
    role        TEXT NOT NULL CHECK (role IN ('NEIGHBOR','YOUTH','SENIOR','PRIVATE_CLUB')),
    created_at  TIMESTAMPTZ NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT reservations_same_lima_day CHECK (
        (lower(time_slot) AT TIME ZONE 'America/Lima')::date
        = (upper(time_slot) AT TIME ZONE 'America/Lima')::date),
    CONSTRAINT reservations_no_overlap EXCLUDE USING gist
        (space_id WITH =, time_slot WITH &&) WHERE (is_active)
);
CREATE INDEX reservations_user_id_idx ON reservations (user_id);

-- Target-state DDL from DATABASE.md §5 — incidents
CREATE TABLE incidents (
    id           UUID PRIMARY KEY,
    space_id     UUID NOT NULL REFERENCES spaces (id),
    reporter_id  TEXT CHECK (char_length(reporter_id) > 0),
    description  TEXT CHECK (char_length(description) BETWEEN 1 AND 2000),
    state        TEXT CHECK (state IN ('UNDER_REVIEW','APPROVED','REJECTED','RESOLVED')),
    created_at   TIMESTAMPTZ NOT NULL,
    resolved_at  TIMESTAMPTZ
);
CREATE INDEX incidents_space_id_idx ON incidents (space_id);

-- Target-state DDL from DATABASE.md §5 — idempotency_keys
CREATE TABLE idempotency_keys (
    key             TEXT PRIMARY KEY,
    request_hash    CHAR(64) NOT NULL,
    state           TEXT CHECK (state IN ('in_flight','completed')),
    response_status INT,
    response_body   JSONB,
    created_at      TIMESTAMPTZ NOT NULL
);
