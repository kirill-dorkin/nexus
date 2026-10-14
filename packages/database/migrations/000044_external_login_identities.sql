-- External login identities extend the existing platform session boundary.
-- Provider access tokens are intentionally never persisted.

CREATE TABLE identity.external_identities (
  provider text NOT NULL CHECK (provider IN ('google', 'github')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 255),
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, subject),
  UNIQUE (user_id, provider)
);

CREATE TABLE identity.oauth_login_states (
  state_hash text PRIMARY KEY CHECK (state_hash ~ '^[0-9a-f]{64}$'),
  provider text NOT NULL CHECK (provider IN ('google', 'github')),
  code_verifier text NOT NULL CHECK (char_length(code_verifier) BETWEEN 43 AND 128),
  return_to text NOT NULL CHECK (char_length(return_to) BETWEEN 1 AND 220),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);

CREATE INDEX oauth_login_states_expiry_idx
  ON identity.oauth_login_states (expires_at);

GRANT SELECT, INSERT, UPDATE ON identity.external_identities TO platform_app;
GRANT SELECT, INSERT, DELETE ON identity.oauth_login_states TO platform_app;
