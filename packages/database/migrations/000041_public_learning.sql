-- Visibility opts in to free public learning; existing and new Offerings stay private.
ALTER TABLE learning_delivery.learning_offerings
  ADD COLUMN visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','public'));
CREATE INDEX learning_offerings_public_learning_idx
  ON learning_delivery.learning_offerings (organization_id, slug)
  WHERE visibility='public' AND status='open'
    AND delivery_mode='self_paced' AND access_mode='membership';

-- Private Organization identity helper used by owner-schema capabilities, never API.
CREATE FUNCTION organizations.find_active_public_organization_slug(requested_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT slug FROM organizations.organizations WHERE id=requested_id AND status='active'
$$;
REVOKE ALL ON FUNCTION organizations.find_active_public_organization_slug(uuid) FROM PUBLIC;

-- Private Delivery gate: an arbitrary CourseVersion UUID cannot authorize public Content.
CREATE FUNCTION learning_delivery.resolve_public_learning_version(org_slug text, offering_slug text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT course_version_id FROM learning_delivery.learning_offerings
   WHERE organization_id=organizations.resolve_active_public_organization_id(org_slug)
     AND slug=offering_slug AND visibility='public' AND status='open'
     AND delivery_mode='self_paced' AND access_mode='membership'
$$;
REVOKE ALL ON FUNCTION learning_delivery.resolve_public_learning_version(text,text) FROM PUBLIC;

CREATE FUNCTION learning_delivery.list_public_learning_addresses()
RETURNS TABLE (organization_slug text, offering_slug text, offering_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT organizations.find_active_public_organization_slug(organization_id), slug, name
    FROM learning_delivery.learning_offerings
   WHERE visibility='public' AND status='open'
     AND delivery_mode='self_paced' AND access_mode='membership'
     AND organizations.find_active_public_organization_slug(organization_id) IS NOT NULL
   ORDER BY 1,2 LIMIT 100
$$;
REVOKE ALL ON FUNCTION learning_delivery.list_public_learning_addresses() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_delivery.list_public_learning_addresses() TO platform_app;

CREATE FUNCTION learning_delivery.find_public_learning_offering(org_slug text, offering_slug text)
RETURNS TABLE (slug text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT o.slug,o.name FROM learning_delivery.learning_offerings o
   WHERE o.organization_id=organizations.resolve_active_public_organization_id(org_slug)
     AND o.slug=offering_slug AND o.visibility='public' AND o.status='open'
     AND o.delivery_mode='self_paced' AND o.access_mode='membership'
$$;
REVOKE ALL ON FUNCTION learning_delivery.find_public_learning_offering(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_delivery.find_public_learning_offering(text,text) TO platform_app;

-- Only Content-owned snapshots are projected here. No protected definitions or raw config.
CREATE FUNCTION learning_content.read_public_learning_course(org_slug text, offering_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT jsonb_build_object('title',v.title,'description',coalesce(v.description,''),
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
REVOKE ALL ON FUNCTION learning_content.read_public_learning_course(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION learning_content.read_public_learning_course(text,text) TO platform_app;

CREATE FUNCTION learning_content.read_public_learning_lesson(org_slug text, offering_slug text, lesson_slug text)
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
            )) ELSE '{}'::jsonb END)
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
