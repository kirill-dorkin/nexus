-- Learning content and delivery persistence.
-- Content identity/versioning is deliberately separate from delivery/enrollment.

CREATE SCHEMA learning_content;
CREATE SCHEMA learning_delivery;

REVOKE ALL ON SCHEMA learning_content, learning_delivery FROM PUBLIC;
GRANT USAGE ON SCHEMA learning_content, learning_delivery TO platform_app;

CREATE TABLE learning_content.courses (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, id)
);

CREATE TABLE learning_content.course_versions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  course_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 5000),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  published_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, course_id)
    REFERENCES learning_content.courses(organization_id, id)
    ON DELETE CASCADE,
  UNIQUE (course_id, version_number),
  UNIQUE (organization_id, id),
  CHECK (
    (status = 'draft' AND published_at IS NULL AND published_by_user_id IS NULL)
    OR
    (status = 'published' AND published_at IS NOT NULL AND published_by_user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX course_versions_one_draft_per_course_key
  ON learning_content.course_versions (course_id)
  WHERE status = 'draft';

CREATE OR REPLACE FUNCTION learning_content.protect_published_course_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'published course versions are immutable';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_content.protect_published_course_version() FROM PUBLIC;

CREATE TRIGGER course_versions_protect_published
BEFORE UPDATE ON learning_content.course_versions
FOR EACH ROW
EXECUTE FUNCTION learning_content.protect_published_course_version();

CREATE TABLE learning_delivery.learning_offerings (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  course_version_id uuid NOT NULL,
  slug text NOT NULL
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  delivery_mode text NOT NULL
    CHECK (delivery_mode IN ('self_paced', 'cohort')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, course_version_id)
    REFERENCES learning_content.course_versions(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, id),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

CREATE OR REPLACE FUNCTION learning_delivery.require_published_course_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  persisted_status text;
BEGIN
  SELECT status
    INTO persisted_status
    FROM learning_content.course_versions
   WHERE organization_id = NEW.organization_id
     AND id = NEW.course_version_id;

  IF persisted_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'learning offerings require a published course version';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.require_published_course_version() FROM PUBLIC;

CREATE TRIGGER learning_offerings_require_published_version
BEFORE INSERT OR UPDATE OF course_version_id, organization_id
ON learning_delivery.learning_offerings
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.require_published_course_version();

CREATE TABLE learning_delivery.enrollments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'withdrawn', 'cancelled')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, offering_id)
    REFERENCES learning_delivery.learning_offerings(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE RESTRICT,
  UNIQUE (offering_id, user_id),
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR
    (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE INDEX courses_organization_idx
  ON learning_content.courses (organization_id, created_at, id);
CREATE INDEX course_versions_course_idx
  ON learning_content.course_versions (organization_id, course_id, version_number);
CREATE INDEX learning_offerings_course_version_idx
  ON learning_delivery.learning_offerings (organization_id, course_version_id);
CREATE INDEX enrollments_user_idx
  ON learning_delivery.enrollments (organization_id, user_id, offering_id);

GRANT SELECT, INSERT, UPDATE ON learning_content.courses TO platform_app;
GRANT SELECT, INSERT, UPDATE ON learning_content.course_versions TO platform_app;
GRANT SELECT, INSERT, UPDATE ON learning_delivery.learning_offerings TO platform_app;
GRANT SELECT, INSERT, UPDATE ON learning_delivery.enrollments TO platform_app;

ALTER TABLE learning_content.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.course_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_delivery.learning_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_delivery.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_app_tenant_policy
  ON learning_content.courses
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY course_versions_app_tenant_policy
  ON learning_content.course_versions
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY learning_offerings_app_tenant_policy
  ON learning_delivery.learning_offerings
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY enrollments_app_tenant_policy
  ON learning_delivery.enrollments
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
