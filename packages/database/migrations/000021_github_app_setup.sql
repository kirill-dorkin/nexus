-- F6 GitHub App trusted setup lifecycle.
-- Mapping rows become tenant-managed only after a short-lived server-side setup
-- session has proven platform authorization and GitHub user access to the installation.

ALTER TABLE integrations.github_installations
  ADD COLUMN github_account_id bigint
    CHECK (github_account_id IS NULL OR github_account_id > 0),
  ADD COLUMN github_account_login text
    CHECK (github_account_login IS NULL OR char_length(btrim(github_account_login)) BETWEEN 1 AND 255),
  ADD COLUMN github_account_type text
    CHECK (github_account_type IS NULL OR char_length(btrim(github_account_type)) BETWEEN 1 AND 100),
  ADD COLUMN repository_selection text
    CHECK (repository_selection IS NULL OR repository_selection IN ('all', 'selected')),
  ADD COLUMN linked_by_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  ADD COLUMN last_synced_at timestamptz;

CREATE TABLE integrations.github_setup_sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  initiated_by_user_id uuid NOT NULL
    REFERENCES identity.users(id) ON DELETE CASCADE,
  installation_state_sha256 text NOT NULL UNIQUE
    CHECK (installation_state_sha256 ~ '^[0-9a-f]{64}$'),
  oauth_state_sha256 text UNIQUE
    CHECK (oauth_state_sha256 IS NULL OR oauth_state_sha256 ~ '^[0-9a-f]{64}$'),
  github_installation_id bigint
    CHECK (github_installation_id IS NULL OR github_installation_id > 0),
  installation_state_consumed_at timestamptz,
  oauth_state_consumed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, initiated_by_user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE CASCADE,
  CHECK (expires_at > created_at),
  CHECK (expires_at <= created_at + interval '30 minutes'),
  CHECK (
    installation_state_consumed_at IS NULL
    OR (github_installation_id IS NOT NULL AND oauth_state_sha256 IS NOT NULL)
  ),
  CHECK (oauth_state_consumed_at IS NULL OR installation_state_consumed_at IS NOT NULL),
  CHECK (completed_at IS NULL OR oauth_state_consumed_at IS NOT NULL)
);

CREATE INDEX github_setup_sessions_organization_idx
  ON integrations.github_setup_sessions (organization_id, created_at DESC, id);
CREATE INDEX github_setup_sessions_expiry_idx
  ON integrations.github_setup_sessions (expires_at, id)
  WHERE completed_at IS NULL;

GRANT USAGE ON SCHEMA integrations TO platform_app;
GRANT SELECT, INSERT, UPDATE ON integrations.github_installations TO platform_app;
GRANT SELECT, INSERT, UPDATE ON integrations.github_repositories TO platform_app;
GRANT SELECT, INSERT, UPDATE ON integrations.github_setup_sessions TO platform_app;

CREATE POLICY github_installations_app_tenant_policy
  ON integrations.github_installations
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY github_repositories_app_tenant_policy
  ON integrations.github_repositories
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

ALTER TABLE integrations.github_setup_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY github_setup_sessions_app_tenant_policy
  ON integrations.github_setup_sessions
  FOR ALL
  TO platform_app
  USING (
    organization_id = platform_internal.current_organization_id()
    AND initiated_by_user_id = platform_internal.current_user_id()
  )
  WITH CHECK (
    organization_id = platform_internal.current_organization_id()
    AND initiated_by_user_id = platform_internal.current_user_id()
  );

-- GitHub redirects do not carry a platform organization id. These narrowly-scoped
-- functions resolve an opaque hashed state together with the authenticated platform
-- user and atomically consume each state transition. They expose no mapping rows.
CREATE OR REPLACE FUNCTION platform_internal.advance_github_setup_to_oauth(
  p_installation_state_sha256 text,
  p_user_id uuid,
  p_github_installation_id bigint,
  p_oauth_state_sha256 text
)
RETURNS TABLE (
  setup_session_id uuid,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  UPDATE integrations.github_setup_sessions AS session
  SET
    installation_state_consumed_at = now(),
    github_installation_id = p_github_installation_id,
    oauth_state_sha256 = p_oauth_state_sha256,
    updated_at = now()
  WHERE session.installation_state_sha256 = p_installation_state_sha256
    AND session.initiated_by_user_id = p_user_id
    AND session.installation_state_consumed_at IS NULL
    AND session.oauth_state_sha256 IS NULL
    AND session.completed_at IS NULL
    AND session.expires_at > now()
  RETURNING session.id, session.organization_id;
END
$$;

CREATE OR REPLACE FUNCTION platform_internal.consume_github_setup_oauth_state(
  p_oauth_state_sha256 text,
  p_user_id uuid
)
RETURNS TABLE (
  setup_session_id uuid,
  organization_id uuid,
  github_installation_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  UPDATE integrations.github_setup_sessions AS session
  SET
    oauth_state_consumed_at = now(),
    updated_at = now()
  WHERE session.oauth_state_sha256 = p_oauth_state_sha256
    AND session.initiated_by_user_id = p_user_id
    AND session.installation_state_consumed_at IS NOT NULL
    AND session.oauth_state_consumed_at IS NULL
    AND session.completed_at IS NULL
    AND session.expires_at > now()
  RETURNING session.id, session.organization_id, session.github_installation_id;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.advance_github_setup_to_oauth(
  text, uuid, bigint, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION platform_internal.consume_github_setup_oauth_state(
  text, uuid
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION platform_internal.advance_github_setup_to_oauth(
  text, uuid, bigint, text
) TO platform_app;
GRANT EXECUTE ON FUNCTION platform_internal.consume_github_setup_oauth_state(
  text, uuid
) TO platform_app;
