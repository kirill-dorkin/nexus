-- Password reset tokens (ADR-0082). Only the SHA-256 hash of a 256-bit token is
-- stored. A token is single use, expires after 30 minutes and is superseded by
-- a newer request. Global identity state like identity.sessions: no tenant RLS.

CREATE TABLE identity.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  superseded_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK (used_at IS NULL OR superseded_at IS NULL)
);

CREATE INDEX password_reset_tokens_open_idx
  ON identity.password_reset_tokens (user_id)
  WHERE used_at IS NULL AND superseded_at IS NULL;

CREATE INDEX password_reset_tokens_created_idx
  ON identity.password_reset_tokens (created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON identity.password_reset_tokens TO platform_app;
