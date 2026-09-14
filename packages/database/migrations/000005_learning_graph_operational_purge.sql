-- Published learning graphs are immutable to platform_app, but operational/migration
-- hard purge must remain possible. platform_app has no DELETE privilege on these tables.

DROP TRIGGER course_version_skills_require_draft
  ON learning_content.course_version_skills;
DROP TRIGGER course_version_activities_require_draft
  ON learning_content.course_version_activities;
DROP TRIGGER activity_skill_mappings_require_draft
  ON learning_content.activity_skill_mappings;

CREATE TRIGGER course_version_skills_require_draft
BEFORE INSERT OR UPDATE ON learning_content.course_version_skills
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph();

CREATE TRIGGER course_version_activities_require_draft
BEFORE INSERT OR UPDATE ON learning_content.course_version_activities
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph();

CREATE TRIGGER activity_skill_mappings_require_draft
BEFORE INSERT OR UPDATE ON learning_content.activity_skill_mappings
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph();
