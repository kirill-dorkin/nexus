-- Foundation 1 authentication credentials and server-side sessions.
-- Authentication is global identity state, so these tables intentionally do not
-- use tenant RLS. Application services remain the authorization boundary.

CREATE TABLE identity.password_credentials (
  user_id uuid PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL
    CHECK (char_length(password_hash) BETWEEN 64 AND 512),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity.sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE
    CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX sessions_active_user_idx
  ON identity.sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON identity.password_credentials TO platform_app;
GRANT SELECT, INSERT, UPDATE ON identity.sessions TO platform_app;
