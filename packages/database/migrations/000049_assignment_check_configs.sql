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

-- Public lessons show an assignment's learner-facing part: language, entry
-- file, starter files, allowed files and the check labels (never the checks
-- themselves, hints or the reference solution). Same function as 000041 plus
-- the `assignment.files` branch.
CREATE OR REPLACE FUNCTION learning_content.read_public_learning_lesson(org_slug text, offering_slug text, lesson_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('slug',l.slug,'title',vl.title,'summary',vl.summary,
    'durationMinutes',vl.duration_minutes,'blocks',(
      SELECT jsonb_agg(CASE b.block_type
        WHEN 'youtube' THEN jsonb_build_object('type','youtube','videoId',b.video_id)
        WHEN 'markdown' THEN jsonb_build_object('type','markdown','markdown',b.markdown)
        WHEN 'activity' THEN jsonb_build_object('type','activity','title',b.title,
          'kind',b.kind,'required',b.required,'activity',
          jsonb_build_object('slug',a.slug,'title',a.title,'instructions',coalesce(a.instructions,''),
            'type',a.activity_type,'question',a.config->'presentation'->'question')
          || CASE WHEN a.activity_type IN ('quiz.single_choice','quiz.multiple_choice')
            THEN jsonb_build_object('options',(
              SELECT jsonb_agg(jsonb_build_object('id',o.value->'id','text',o.value->'text') ORDER BY o.ordinality)
                FROM jsonb_array_elements(a.config->'presentation'->'options') WITH ORDINALITY o
            ))
            WHEN a.activity_type='assignment.files'
            THEN jsonb_build_object(
              'lang',a.config->'presentation'->'lang',
              'entry',a.config->'presentation'->'entry',
              'starterFiles',a.config->'presentation'->'starterFiles',
              'allowedFiles',a.config->'presentation'->'allowedFiles',
              'checkLabels',coalesce((
                SELECT jsonb_agg(c.value->'label' ORDER BY c.ordinality)
                  FROM learning_content.assignment_check_configs ac,
                       jsonb_array_elements(ac.config->'checks') WITH ORDINALITY c
                 WHERE ac.organization_id=a.organization_id AND ac.activity_version_id=a.id
              ),'[]'::jsonb))
            ELSE '{}'::jsonb END)
        END ORDER BY b.position)
      FROM learning_content.course_version_lesson_blocks b
      LEFT JOIN learning_content.course_version_activities a ON a.organization_id=b.organization_id
        AND a.course_version_id=b.course_version_id AND a.activity_id=b.activity_id
      WHERE b.organization_id=v.organization_id AND b.course_version_id=v.id AND b.lesson_id=vl.lesson_id))
  FROM learning_content.course_versions v
  JOIN learning_content.courses c ON c.organization_id=v.organization_id AND c.id=v.course_id
  JOIN learning_content.course_version_lessons vl ON vl.organization_id=v.organization_id AND vl.course_version_id=v.id
  JOIN learning_content.lessons l ON l.organization_id=vl.organization_id AND l.course_id=vl.course_id AND l.id=vl.lesson_id
  WHERE v.id=learning_delivery.resolve_public_learning_version(org_slug,offering_slug)
    AND c.status='active' AND v.status='published' AND v.manifest_schema_version=1 AND l.slug=lesson_slug
$$;
REVOKE ALL ON FUNCTION learning_content.read_public_learning_lesson(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_content.read_public_learning_lesson(text,text,text) TO platform_app;
