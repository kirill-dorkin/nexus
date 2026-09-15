-- F6 project/team repository-backed vertical.
-- Project state is owned independently from external Git hosting identities.

CREATE SCHEMA projects;
REVOKE ALL ON SCHEMA projects FROM PUBLIC;

CREATE TABLE projects.teams (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

CREATE TABLE projects.team_memberships (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  added_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  FOREIGN KEY (organization_id, team_id)
    REFERENCES projects.teams(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organizations.memberships(organization_id, user_id) ON DELETE RESTRICT,
  CHECK (removed_at IS NULL OR removed_at >= joined_at)
);

CREATE UNIQUE INDEX team_memberships_active_member_key
  ON projects.team_memberships (team_id, user_id)
  WHERE removed_at IS NULL;
CREATE INDEX team_memberships_user_idx
  ON projects.team_memberships (organization_id, user_id, team_id)
  WHERE removed_at IS NULL;

CREATE TABLE projects.projects (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  team_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 180),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, team_id)
    REFERENCES projects.teams(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, id)
);

CREATE INDEX projects_team_idx
  ON projects.projects (organization_id, team_id, created_at, id);

CREATE TABLE projects.repository_bindings (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  github_repository_mapping_id uuid NOT NULL
    REFERENCES integrations.github_repositories(id) ON DELETE RESTRICT,
  connected_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  disconnected_at timestamptz,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES projects.projects(organization_id, id) ON DELETE CASCADE,
  CHECK (
    (disconnected_at IS NULL AND disconnected_by_user_id IS NULL)
    OR (disconnected_at IS NOT NULL AND disconnected_by_user_id IS NOT NULL)
  ),
  CHECK (disconnected_at IS NULL OR disconnected_at >= connected_at)
);

CREATE UNIQUE INDEX repository_bindings_active_project_key
  ON projects.repository_bindings (project_id)
  WHERE disconnected_at IS NULL;
CREATE UNIQUE INDEX repository_bindings_active_repository_key
  ON projects.repository_bindings (github_repository_mapping_id)
  WHERE disconnected_at IS NULL;
CREATE INDEX repository_bindings_project_history_idx
  ON projects.repository_bindings (organization_id, project_id, connected_at, id);

-- Defense in depth: application code resolves repository references only through
-- the Integrations public query boundary. This trigger independently prevents a
-- direct Projects write from binding a foreign, suspended, or removed mapping.
CREATE OR REPLACE FUNCTION platform_internal.guard_active_project_repository_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  PERFORM 1
  FROM integrations.github_repositories AS repository
  JOIN integrations.github_installations AS installation
    ON installation.organization_id = repository.organization_id
   AND installation.github_installation_id = repository.github_installation_id
  WHERE repository.id = NEW.github_repository_mapping_id
    AND repository.organization_id = NEW.organization_id
    AND repository.status = 'active'
    AND installation.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repository mapping is not an active trusted mapping for this organization'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.guard_active_project_repository_binding() FROM PUBLIC;

CREATE TRIGGER repository_binding_active_mapping_guard
BEFORE INSERT OR UPDATE OF organization_id, github_repository_mapping_id, disconnected_at
ON projects.repository_bindings
FOR EACH ROW
WHEN (NEW.disconnected_at IS NULL)
EXECUTE FUNCTION platform_internal.guard_active_project_repository_binding();

GRANT USAGE ON SCHEMA projects TO platform_app;
GRANT SELECT, INSERT, UPDATE ON projects.teams TO platform_app;
GRANT SELECT, INSERT, UPDATE ON projects.team_memberships TO platform_app;
GRANT SELECT, INSERT, UPDATE ON projects.projects TO platform_app;
GRANT SELECT, INSERT, UPDATE ON projects.repository_bindings TO platform_app;

ALTER TABLE projects.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects.repository_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_teams_app_tenant_policy
  ON projects.teams
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY project_team_memberships_app_tenant_policy
  ON projects.team_memberships
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY projects_app_tenant_policy
  ON projects.projects
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY project_repository_bindings_app_tenant_policy
  ON projects.repository_bindings
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
