-- MVP authoring: one canonical CourseVersion graph, with stable Lesson identities.
ALTER TABLE learning_content.course_versions
  ADD COLUMN manifest_schema_version integer CHECK (manifest_schema_version = 1),
  ADD COLUMN authoring_revision integer NOT NULL DEFAULT 0 CHECK (authoring_revision >= 0),
  ADD CONSTRAINT course_versions_org_course_id_key UNIQUE (organization_id, course_id, id);
ALTER TABLE learning_content.course_version_activities
  ADD CONSTRAINT course_version_activities_org_version_id_key UNIQUE (organization_id, course_version_id, id);
ALTER TABLE learning_content.activities
  ADD CONSTRAINT activities_org_course_id_key UNIQUE (organization_id, course_id, id);

CREATE TABLE learning_content.lessons (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  course_id uuid NOT NULL,
  slug text NOT NULL CHECK (char_length(slug) BETWEEN 2 AND 63 AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id),
  FOREIGN KEY (organization_id, course_id) REFERENCES learning_content.courses(organization_id, id) ON DELETE CASCADE,
  UNIQUE (organization_id, course_id, slug),
  UNIQUE (organization_id, course_id, id)
);
CREATE TABLE learning_content.manifest_activity_identities (
  organization_id uuid NOT NULL,
  course_id uuid NOT NULL,
  slug text NOT NULL CHECK (char_length(slug) BETWEEN 2 AND 63 AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  activity_id uuid NOT NULL,
  PRIMARY KEY (organization_id, course_id, slug),
  UNIQUE (organization_id, activity_id),
  FOREIGN KEY (organization_id, course_id) REFERENCES learning_content.courses(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, course_id, activity_id) REFERENCES learning_content.activities(organization_id, course_id, id) ON DELETE CASCADE
);
CREATE TABLE learning_content.course_version_lessons (
  organization_id uuid NOT NULL,
  course_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  summary text NOT NULL CHECK (char_length(summary) <= 5000),
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 1 AND 1440),
  position integer NOT NULL CHECK (position >= 0),
  PRIMARY KEY (course_version_id, lesson_id),
  UNIQUE (organization_id, course_version_id, lesson_id),
  UNIQUE (course_version_id, position),
  FOREIGN KEY (organization_id, course_id, course_version_id) REFERENCES learning_content.course_versions(organization_id, course_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, course_id, lesson_id) REFERENCES learning_content.lessons(organization_id, course_id, id) ON DELETE CASCADE
);
CREATE TABLE learning_content.course_version_lesson_blocks (
  organization_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  block_type text NOT NULL CHECK (block_type IN ('youtube', 'markdown', 'activity')),
  video_id text,
  markdown text,
  activity_id uuid,
  title text CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 1 AND 200),
  kind text CHECK (kind IN ('practice', 'homework')),
  required boolean,
  PRIMARY KEY (course_version_id, lesson_id, position),
  FOREIGN KEY (organization_id, course_version_id, lesson_id) REFERENCES learning_content.course_version_lessons(organization_id, course_version_id, lesson_id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, course_version_id, activity_id) REFERENCES learning_content.course_version_activities(organization_id, course_version_id, activity_id),
  CHECK (
    (block_type='youtube' AND video_id ~ '^[A-Za-z0-9_-]{11}$' AND video_id IS NOT NULL AND markdown IS NULL AND activity_id IS NULL AND title IS NULL AND kind IS NULL AND required IS NULL)
    OR (block_type='markdown' AND markdown IS NOT NULL AND char_length(markdown) BETWEEN 1 AND 50000 AND video_id IS NULL AND activity_id IS NULL AND title IS NULL AND kind IS NULL AND required IS NULL)
    OR (block_type='activity' AND activity_id IS NOT NULL AND kind IS NOT NULL AND required IS NOT NULL AND video_id IS NULL AND markdown IS NULL)
  )
);
-- Protected authoring state: NEVER merged into learner-visible Activity.config.
CREATE TABLE learning_content.quiz_validation_configs (
  organization_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version=1),
  config jsonb NOT NULL CHECK (jsonb_typeof(config)='object'),
  PRIMARY KEY (activity_version_id),
  FOREIGN KEY (organization_id, course_version_id, activity_version_id) REFERENCES learning_content.course_version_activities(organization_id, course_version_id, id) ON DELETE CASCADE
);

-- Serialize graph mutations with publication; the previous status-only read could race.
CREATE OR REPLACE FUNCTION learning_content.require_draft_course_version_graph()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE persisted_status text;
BEGIN
  -- Preserve ADR-0012/000005 operational purge; API cannot assume a migration role.
  IF TG_OP='DELETE' AND current_user <> 'platform_app' THEN RETURN OLD; END IF;
  IF TG_OP IN ('UPDATE','DELETE') THEN
    SELECT status INTO persisted_status FROM learning_content.course_versions
      WHERE organization_id=OLD.organization_id AND id=OLD.course_version_id FOR UPDATE;
    IF persisted_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='published course version learning graphs are immutable';
    END IF;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    SELECT status INTO persisted_status FROM learning_content.course_versions
      WHERE organization_id=NEW.organization_id AND id=NEW.course_version_id FOR UPDATE;
    IF persisted_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='published course version learning graphs are immutable';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION learning_content.require_draft_course_version_graph() FROM PUBLIC;

CREATE FUNCTION learning_content.bump_authoring_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='DELETE' AND current_user <> 'platform_app' THEN RETURN OLD; END IF;
  IF TG_OP='DELETE' THEN
    UPDATE learning_content.course_versions SET authoring_revision=authoring_revision+1
      WHERE organization_id=OLD.organization_id AND id=OLD.course_version_id;
    RETURN OLD;
  END IF;
  UPDATE learning_content.course_versions SET authoring_revision=authoring_revision+1
    WHERE organization_id=NEW.organization_id AND id=NEW.course_version_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION learning_content.bump_authoring_revision() FROM PUBLIC;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['course_version_skills','course_version_activities','activity_skill_mappings'] LOOP
    EXECUTE format('DROP TRIGGER %I ON learning_content.%I',t||'_require_draft',t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON learning_content.%I FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph()', t||'_require_draft',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['course_version_lessons','course_version_lesson_blocks','quiz_validation_configs'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OR DELETE ON learning_content.%I FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph()', t||'_require_draft',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['course_version_lessons','course_version_lesson_blocks','quiz_validation_configs','course_version_skills','course_version_activities','activity_skill_mappings','course_version_skill_remediations'] LOOP
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON learning_content.%I FOR EACH ROW EXECUTE FUNCTION learning_content.bump_authoring_revision()', t||'_revision',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['lessons','manifest_activity_identities','course_version_lessons','course_version_lesson_blocks','quiz_validation_configs'] LOOP
    EXECUTE format('ALTER TABLE learning_content.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY %I ON learning_content.%I FOR ALL TO platform_app USING (organization_id=platform_internal.current_organization_id()) WITH CHECK (organization_id=platform_internal.current_organization_id())',t||'_tenant',t);
  END LOOP;
END $$;
GRANT SELECT, INSERT ON learning_content.lessons, learning_content.manifest_activity_identities TO platform_app;
GRANT SELECT, INSERT, DELETE ON learning_content.course_version_lessons, learning_content.course_version_lesson_blocks, learning_content.quiz_validation_configs TO platform_app;
-- Existing immutable-graph triggers defend these new draft-only delete privileges.
GRANT DELETE ON learning_content.course_version_skills, learning_content.course_version_activities, learning_content.activity_skill_mappings TO platform_app;
