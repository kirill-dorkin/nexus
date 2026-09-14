-- Instructor-led delivery execution and grouping foundation.
-- Enrollment remains offering participation; runs/groups organize delivery without creating access.

ALTER TABLE learning_delivery.enrollments
  ADD CONSTRAINT enrollments_organization_id_id_key
  UNIQUE (organization_id, id);

CREATE TABLE learning_delivery.course_runs (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL,
  slug text NOT NULL
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, offering_id)
    REFERENCES learning_delivery.learning_offerings(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (offering_id, slug),
  UNIQUE (organization_id, id),
  CHECK (ends_at > starts_at)
);

CREATE OR REPLACE FUNCTION learning_delivery.validate_course_run_offering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  persisted_mode text;
  persisted_status text;
  offering_starts_at timestamptz;
  offering_ends_at timestamptz;
BEGIN
  SELECT delivery_mode, status, starts_at, ends_at
    INTO persisted_mode, persisted_status, offering_starts_at, offering_ends_at
    FROM learning_delivery.learning_offerings
   WHERE organization_id = NEW.organization_id
     AND id = NEW.offering_id;

  IF persisted_mode IS DISTINCT FROM 'cohort' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'course runs require a cohort learning offering';
  END IF;

  IF persisted_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'course runs require an open learning offering';
  END IF;

  IF offering_starts_at IS NOT NULL AND NEW.starts_at < offering_starts_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'course run cannot start before its offering window';
  END IF;

  IF offering_ends_at IS NOT NULL AND NEW.ends_at > offering_ends_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'course run cannot end after its offering window';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.validate_course_run_offering() FROM PUBLIC;

CREATE TRIGGER course_runs_validate_offering
BEFORE INSERT OR UPDATE OF organization_id, offering_id, starts_at, ends_at
ON learning_delivery.course_runs
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.validate_course_run_offering();

CREATE TABLE learning_delivery.group_sets (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  course_run_id uuid NOT NULL,
  slug text NOT NULL
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, course_run_id)
    REFERENCES learning_delivery.course_runs(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (course_run_id, slug),
  UNIQUE (organization_id, id)
);

CREATE TABLE learning_delivery.groups (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  group_set_id uuid NOT NULL,
  slug text NOT NULL
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, group_set_id)
    REFERENCES learning_delivery.group_sets(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (group_set_id, slug),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, group_set_id, id)
);

CREATE TABLE learning_delivery.group_memberships (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  group_set_id uuid NOT NULL,
  group_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  assigned_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, group_set_id, group_id)
    REFERENCES learning_delivery.groups(organization_id, group_set_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, enrollment_id)
    REFERENCES learning_delivery.enrollments(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  CHECK (ended_at IS NULL OR ended_at >= assigned_at)
);

CREATE UNIQUE INDEX group_memberships_one_active_per_set_key
  ON learning_delivery.group_memberships (group_set_id, enrollment_id)
  WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION learning_delivery.validate_group_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  run_offering_id uuid;
  persisted_enrollment_offering_id uuid;
  persisted_enrollment_status text;
BEGIN
  SELECT cr.offering_id
    INTO run_offering_id
    FROM learning_delivery.group_sets gs
    JOIN learning_delivery.course_runs cr
      ON cr.organization_id = gs.organization_id
     AND cr.id = gs.course_run_id
   WHERE gs.organization_id = NEW.organization_id
     AND gs.id = NEW.group_set_id;

  SELECT offering_id, status
    INTO persisted_enrollment_offering_id, persisted_enrollment_status
    FROM learning_delivery.enrollments
   WHERE organization_id = NEW.organization_id
     AND id = NEW.enrollment_id;

  IF NEW.ended_at IS NULL
     AND persisted_enrollment_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'active group membership requires an active enrollment';
  END IF;

  IF persisted_enrollment_offering_id IS DISTINCT FROM run_offering_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'group membership enrollment must belong to the course run offering';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.validate_group_membership() FROM PUBLIC;

CREATE TRIGGER group_memberships_validate_enrollment
BEFORE INSERT OR UPDATE OF organization_id, group_set_id, enrollment_id, ended_at
ON learning_delivery.group_memberships
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.validate_group_membership();

CREATE INDEX course_runs_offering_idx
  ON learning_delivery.course_runs (organization_id, offering_id, starts_at, id);
CREATE INDEX group_sets_run_idx
  ON learning_delivery.group_sets (organization_id, course_run_id, id);
CREATE INDEX groups_set_idx
  ON learning_delivery.groups (organization_id, group_set_id, id);
CREATE INDEX group_memberships_enrollment_idx
  ON learning_delivery.group_memberships (organization_id, enrollment_id, group_set_id);

GRANT SELECT, INSERT, UPDATE ON learning_delivery.course_runs TO platform_app;
GRANT SELECT, INSERT, UPDATE ON learning_delivery.group_sets TO platform_app;
GRANT SELECT, INSERT, UPDATE ON learning_delivery.groups TO platform_app;
GRANT SELECT, INSERT, UPDATE ON learning_delivery.group_memberships TO platform_app;

ALTER TABLE learning_delivery.course_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_delivery.group_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_delivery.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_delivery.group_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_runs_app_tenant_policy
  ON learning_delivery.course_runs
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY group_sets_app_tenant_policy
  ON learning_delivery.group_sets
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY groups_app_tenant_policy
  ON learning_delivery.groups
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY group_memberships_app_tenant_policy
  ON learning_delivery.group_memberships
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
