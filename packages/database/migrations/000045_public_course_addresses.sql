-- Stable public course addresses (ADR-0061).
-- A Course slug is curriculum identity and survives new CourseVersions; an Offering is pinned to one
-- immutable CourseVersion. Public learners therefore address a course by its slug, and Delivery picks
-- the newest public free Offering that currently delivers one of that course's published versions.

-- Private Content helper: published version ids of one active course. Callable only by owner-schema
-- capabilities (never granted to the runtime role), so it cannot enumerate content on its own.
CREATE FUNCTION learning_content.find_public_course_version_ids(requested_organization_id uuid, course_slug text)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT v.id FROM learning_content.course_versions v
    JOIN learning_content.courses c ON c.organization_id=v.organization_id AND c.id=v.course_id
   WHERE c.organization_id=requested_organization_id AND c.slug=course_slug
     AND c.status='active' AND v.status='published' AND v.manifest_schema_version=1
$$;
REVOKE ALL ON FUNCTION learning_content.find_public_course_version_ids(uuid,text) FROM PUBLIC;

-- Delivery gate: course slug -> the Offering slug that serves it publicly right now, or NULL.
CREATE FUNCTION learning_delivery.resolve_public_course_offering(org_slug text, course_slug text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT o.slug FROM learning_delivery.learning_offerings o
   WHERE o.organization_id=organizations.resolve_active_public_organization_id(org_slug)
     AND o.visibility='public' AND o.status='open'
     AND o.delivery_mode='self_paced' AND o.access_mode='membership'
     AND o.course_version_id IN (
       SELECT learning_content.find_public_course_version_ids(o.organization_id, course_slug))
   ORDER BY o.created_at DESC, o.id DESC
   LIMIT 1
$$;
REVOKE ALL ON FUNCTION learning_delivery.resolve_public_course_offering(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_delivery.resolve_public_course_offering(text,text) TO platform_app;

-- The public course projection now names its stable course slug so clients can build canonical links.
CREATE OR REPLACE FUNCTION learning_content.read_public_learning_course(org_slug text, offering_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('slug',c.slug,'title',v.title,'description',coalesce(v.description,''),
    'lessons',(SELECT jsonb_agg(jsonb_build_object('slug',l.slug,'title',vl.title,
      'summary',vl.summary,'durationMinutes',vl.duration_minutes) ORDER BY vl.position)
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
