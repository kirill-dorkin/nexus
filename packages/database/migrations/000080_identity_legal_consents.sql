-- DRAFT (WP-7 legal minimum): placeholder sequence number. Renumber to the next free
-- sequence before the owner applies it; do not merge until the owner approves the texts.
--
-- Records which version of each legal document a user accepted and when. Rows are
-- append-only evidence of consent: a changed text gets a new version and a new row.
-- Global identity state like identity.sessions, so no tenant RLS.

CREATE TABLE identity.legal_consents (
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  document text NOT NULL CHECK (document IN ('terms', 'personal_data')),
  version text NOT NULL CHECK (version ~ '^[a-z0-9][a-z0-9.-]{0,63}$'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, document, version)
);

GRANT SELECT, INSERT ON identity.legal_consents TO platform_app;
