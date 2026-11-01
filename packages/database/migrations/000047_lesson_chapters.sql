-- Lesson chapters (ADR-0063): an optional chapter name per Lesson in a CourseVersion, used to group
-- a long program into sections. Part of the published graph, so it is immutable once published
-- (the existing require_draft trigger covers the new column).
ALTER TABLE learning_content.course_version_lessons
  ADD COLUMN chapter text CHECK (chapter IS NULL OR char_length(btrim(chapter)) BETWEEN 1 AND 80);

-- The public course projection names the chapter of each lesson when there is one.
CREATE OR REPLACE FUNCTION learning_content.read_public_learning_course(org_slug text, offering_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('slug',c.slug,'title',v.title,'description',coalesce(v.description,''),
    'lessons',(SELECT jsonb_agg(jsonb_build_object('slug',l.slug,'title',vl.title,
      'summary',vl.summary,'durationMinutes',vl.duration_minutes)
      || CASE WHEN vl.chapter IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('chapter',vl.chapter) END
      ORDER BY vl.position)
      FROM learning_content.course_version_lessons vl
      JOIN learning_content.lessons l ON l.organization_id=vl.organization_id
        AND l.course_id=vl.course_id AND l.id=vl.lesson_id
      WHERE vl.organization_id=v.organization_id AND vl.course_version_id=v.id))
  FROM learning_content.course_versions v
  JOIN learning_content.courses c ON c.organization_id=v.organization_id AND c.id=v.course_id
  WHERE v.id=learning_delivery.resolve_public_learning_version(org_slug,offering_slug)
    AND c.status='active' AND v.status='published' AND v.manifest_schema_version=1
    AND EXISTS (SELECT 1 FROM learning_content.course_version_lessons vl
      WHERE vl.organization_id=v.organization_id AND vl.course_version_id=v.id)
$$;
