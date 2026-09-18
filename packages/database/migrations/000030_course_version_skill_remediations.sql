-- F8.3: authored CourseVersion remediation mappings for explainable intervention policy.

ALTER TABLE learning_content.activity_skill_mappings
  ADD CONSTRAINT activity_skill_mappings_organization_version_activity_skill_key
  UNIQUE (organization_id, course_version_id, activity_id, skill_id);

CREATE TABLE learning_content.course_version_skill_remediations (
  organization_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_version_id, skill_id, activity_id),
  FOREIGN KEY (organization_id, course_version_id, skill_id)
    REFERENCES learning_content.course_version_skills(
      organization_id,
      course_version_id,
      skill_id
    )
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, course_version_id, activity_id, skill_id)
    REFERENCES learning_content.activity_skill_mappings(
      organization_id,
      course_version_id,
      activity_id,
      skill_id
    )
    ON DELETE CASCADE,
  UNIQUE (course_version_id, skill_id, position)
);

CREATE TRIGGER course_version_skill_remediations_require_draft
BEFORE INSERT OR UPDATE OR DELETE
ON learning_content.course_version_skill_remediations
FOR EACH ROW
EXECUTE FUNCTION learning_content.require_draft_course_version_graph();

CREATE INDEX course_version_skill_remediations_order_idx
  ON learning_content.course_version_skill_remediations (
    organization_id,
    course_version_id,
    skill_id,
    position,
    activity_id
  );

GRANT SELECT, INSERT, DELETE
  ON learning_content.course_version_skill_remediations
  TO platform_app;

ALTER TABLE learning_content.course_version_skill_remediations
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_version_skill_remediations_app_tenant_policy
  ON learning_content.course_version_skill_remediations
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
