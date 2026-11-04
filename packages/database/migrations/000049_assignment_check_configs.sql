-- File assignments (ADR-0073): the checks and the reference solution of an
-- `assignment.files` activity version. Protected authoring state like quiz
-- answer keys: NEVER merged into learner-visible Activity config, readable
-- only inside the owning organization, immutable once the course version is
-- published. Additive: nothing reads it until the API starts importing
-- assignments.
CREATE TABLE learning_content.assignment_check_configs (
  organization_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  config jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  PRIMARY KEY (activity_version_id),
  FOREIGN KEY (organization_id, course_version_id, activity_version_id)
    REFERENCES learning_content.course_version_activities (organization_id, course_version_id, id)
    ON DELETE CASCADE
);

CREATE TRIGGER assignment_check_configs_require_draft
  BEFORE INSERT OR UPDATE OR DELETE ON learning_content.assignment_check_configs
  FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph();

CREATE TRIGGER assignment_check_configs_revision
  AFTER INSERT OR UPDATE OR DELETE ON learning_content.assignment_check_configs
  FOR EACH ROW EXECUTE FUNCTION learning_content.bump_authoring_revision();

ALTER TABLE learning_content.assignment_check_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignment_check_configs_tenant ON learning_content.assignment_check_configs
  FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

GRANT SELECT, INSERT, DELETE ON learning_content.assignment_check_configs TO platform_app;
