-- Learning graph and append-only progress evidence.
-- Stable Skill/Activity identities are separated from immutable course-version snapshots.

CREATE SCHEMA learning_progress;

REVOKE ALL ON SCHEMA learning_progress FROM PUBLIC;
GRANT USAGE ON SCHEMA learning_progress TO platform_app;

CREATE TABLE learning_content.skills (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  skill_key text NOT NULL
    CHECK (
      char_length(skill_key) BETWEEN 2 AND 63
      AND skill_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  canonical_title text NOT NULL
    CHECK (char_length(btrim(canonical_title)) BETWEEN 1 AND 200),
  canonical_description text
    CHECK (canonical_description IS NULL OR char_length(canonical_description) <= 5000),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'retired')),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, skill_key),
  UNIQUE (organization_id, id)
);

CREATE TABLE learning_content.activities (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  course_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, course_id)
    REFERENCES learning_content.courses(organization_id, id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, id)
);

CREATE TABLE learning_content.course_version_skills (
  organization_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 5000),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_version_id, skill_id),
  FOREIGN KEY (organization_id, course_version_id)
    REFERENCES learning_content.course_versions(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, skill_id)
    REFERENCES learning_content.skills(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, course_version_id, skill_id)
);

CREATE TABLE learning_content.course_version_activities (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  slug text NOT NULL
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  activity_type text NOT NULL
    CHECK (
      char_length(activity_type) BETWEEN 2 AND 80
      AND activity_type ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
    ),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  instructions text CHECK (instructions IS NULL OR char_length(instructions) <= 20000),
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config) = 'object'),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, course_version_id)
    REFERENCES learning_content.course_versions(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, activity_id)
    REFERENCES learning_content.activities(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (course_version_id, activity_id),
  UNIQUE (course_version_id, slug),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, course_version_id, activity_id)
);

CREATE TABLE learning_content.activity_skill_mappings (
  organization_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'primary'
    CHECK (role IN ('primary', 'supporting')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_version_id, activity_id, skill_id),
  FOREIGN KEY (organization_id, course_version_id, activity_id)
    REFERENCES learning_content.course_version_activities(
      organization_id,
      course_version_id,
      activity_id
    )
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, course_version_id, skill_id)
    REFERENCES learning_content.course_version_skills(
      organization_id,
      course_version_id,
      skill_id
    )
    ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION learning_content.require_draft_course_version_graph()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  persisted_status text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT status
      INTO persisted_status
      FROM learning_content.course_versions
     WHERE organization_id = OLD.organization_id
       AND id = OLD.course_version_id;

    IF persisted_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'published course version learning graphs are immutable';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT status
      INTO persisted_status
      FROM learning_content.course_versions
     WHERE organization_id = NEW.organization_id
       AND id = NEW.course_version_id;

    IF persisted_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'published course version learning graphs are immutable';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_content.require_draft_course_version_graph() FROM PUBLIC;

CREATE TRIGGER course_version_skills_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.course_version_skills
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph();

CREATE TRIGGER course_version_activities_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.course_version_activities
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph();

CREATE TRIGGER activity_skill_mappings_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.activity_skill_mappings
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph();

ALTER TABLE learning_delivery.enrollments
  ADD CONSTRAINT enrollments_organization_id_id_key UNIQUE (organization_id, id);

CREATE TABLE learning_progress.attempts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  submission jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(submission) = 'object'),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, enrollment_id)
    REFERENCES learning_delivery.enrollments(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (enrollment_id, activity_version_id, attempt_number),
  UNIQUE (organization_id, id)
);

CREATE OR REPLACE FUNCTION learning_progress.validate_attempt_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  enrollment_status text;
  offering_course_version_id uuid;
  activity_course_version_id uuid;
BEGIN
  SELECT enrollment.status,
         offering.course_version_id,
         activity.course_version_id
    INTO enrollment_status,
         offering_course_version_id,
         activity_course_version_id
    FROM learning_delivery.enrollments AS enrollment
    JOIN learning_delivery.learning_offerings AS offering
      ON offering.organization_id = enrollment.organization_id
     AND offering.id = enrollment.offering_id
    JOIN learning_content.course_version_activities AS activity
      ON activity.organization_id = NEW.organization_id
     AND activity.id = NEW.activity_version_id
   WHERE enrollment.organization_id = NEW.organization_id
     AND enrollment.id = NEW.enrollment_id;

  IF enrollment_status IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'attempt requires a valid enrollment and activity';
  END IF;

  IF enrollment_status <> 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'attempt requires an active enrollment';
  END IF;

  IF offering_course_version_id IS DISTINCT FROM activity_course_version_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'attempt activity must belong to the enrollment course version';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_progress.validate_attempt_context() FROM PUBLIC;

CREATE TRIGGER attempts_validate_context
BEFORE INSERT ON learning_progress.attempts
FOR EACH ROW EXECUTE FUNCTION learning_progress.validate_attempt_context();

CREATE TABLE learning_progress.evidence (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  kind text NOT NULL
    CHECK (
      char_length(kind) BETWEEN 2 AND 80
      AND kind ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
    ),
  score numeric(6,5) CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  recorded_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, attempt_id)
    REFERENCES learning_progress.attempts(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, skill_id)
    REFERENCES learning_content.skills(organization_id, id)
    ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION learning_progress.validate_evidence_skill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM learning_progress.attempts AS attempt
      JOIN learning_content.course_version_activities AS activity
        ON activity.organization_id = attempt.organization_id
       AND activity.id = attempt.activity_version_id
      JOIN learning_content.activity_skill_mappings AS mapping
        ON mapping.organization_id = activity.organization_id
       AND mapping.course_version_id = activity.course_version_id
       AND mapping.activity_id = activity.activity_id
       AND mapping.skill_id = NEW.skill_id
     WHERE attempt.organization_id = NEW.organization_id
       AND attempt.id = NEW.attempt_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'evidence skill must be assessed by the attempt activity';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_progress.validate_evidence_skill() FROM PUBLIC;

CREATE TRIGGER evidence_validate_skill
BEFORE INSERT ON learning_progress.evidence
FOR EACH ROW EXECUTE FUNCTION learning_progress.validate_evidence_skill();

CREATE INDEX skills_organization_idx
  ON learning_content.skills (organization_id, status, skill_key);
CREATE INDEX activities_course_idx
  ON learning_content.activities (organization_id, course_id, id);
CREATE INDEX course_version_skills_order_idx
  ON learning_content.course_version_skills (organization_id, course_version_id, position, skill_id);
CREATE INDEX course_version_activities_order_idx
  ON learning_content.course_version_activities (organization_id, course_version_id, position, id);
CREATE INDEX attempts_enrollment_idx
  ON learning_progress.attempts (organization_id, enrollment_id, submitted_at, id);
CREATE INDEX evidence_attempt_idx
  ON learning_progress.evidence (organization_id, attempt_id, created_at, id);
CREATE INDEX evidence_skill_idx
  ON learning_progress.evidence (organization_id, skill_id, created_at, id);

GRANT SELECT, INSERT ON learning_content.skills TO platform_app;
GRANT SELECT, INSERT ON learning_content.activities TO platform_app;
GRANT SELECT, INSERT ON learning_content.course_version_skills TO platform_app;
GRANT SELECT, INSERT ON learning_content.course_version_activities TO platform_app;
GRANT SELECT, INSERT ON learning_content.activity_skill_mappings TO platform_app;
GRANT SELECT, INSERT ON learning_progress.attempts TO platform_app;
GRANT SELECT, INSERT ON learning_progress.evidence TO platform_app;

ALTER TABLE learning_content.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.course_version_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.course_version_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.activity_skill_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY skills_app_tenant_policy
  ON learning_content.skills FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY activities_app_tenant_policy
  ON learning_content.activities FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY course_version_skills_app_tenant_policy
  ON learning_content.course_version_skills FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY course_version_activities_app_tenant_policy
  ON learning_content.course_version_activities FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY activity_skill_mappings_app_tenant_policy
  ON learning_content.activity_skill_mappings FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY attempts_app_tenant_policy
  ON learning_progress.attempts FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY evidence_app_tenant_policy
  ON learning_progress.evidence FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
