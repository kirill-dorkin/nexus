-- F6 Project activity read model.
-- Normalized Project facts remain append-only; platform_app receives read-only,
-- tenant-scoped access for the authorized Projects application surface.

GRANT SELECT ON projects.github_project_facts TO platform_app;

CREATE POLICY github_project_facts_app_select_policy
  ON projects.github_project_facts
  FOR SELECT
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id());
