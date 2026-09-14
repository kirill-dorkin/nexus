-- Durable delivery assignments across self-paced and cohort offerings.
-- Assignment pins an exact ActivityVersion while keeping audience and lifecycle in Delivery.

CREATE TABLE learning_delivery.assignments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  offering_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  slug text NOT NULL
    CHECK (
      char_length(slug) BETWEEN 2 AND 63
      AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  audience_type text NOT NULL
    CHECK (audience_type IN ('offering', 'course_run', 'group', 'enrollment')),
  course_run_id uuid,
  group_id uuid,
  enrollment_id uuid,
  available_at timestamptz,
  due_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  cancelled_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, offering_id)
    REFERENCES learning_delivery.learning_offerings(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, course_run_id)
    REFERENCES learning_delivery.course_runs(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, group_id)
    REFERENCES learning_delivery.groups(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, enrollment_id)
    REFERENCES learning_delivery.enrollments(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (offering_id, slug),
  UNIQUE (organization_id, id),
  CHECK (available_at IS NULL OR due_at IS NULL OR due_at > available_at),
  CHECK (
    (audience_type = 'offering'
      AND course_run_id IS NULL
      AND group_id IS NULL
      AND enrollment_id IS NULL)
    OR
    (audience_type = 'course_run'
      AND course_run_id IS NOT NULL
      AND group_id IS NULL
      AND enrollment_id IS NULL)
    OR
    (audience_type = 'group'
      AND course_run_id IS NULL
      AND group_id IS NOT NULL
      AND enrollment_id IS NULL)
    OR
    (audience_type = 'enrollment'
      AND course_run_id IS NULL
      AND group_id IS NULL
      AND enrollment_id IS NOT NULL)
  ),
  CHECK (
    (cancelled_at IS NULL AND cancelled_by_user_id IS NULL)
    OR
    (cancelled_at IS NOT NULL AND cancelled_by_user_id IS NOT NULL)
  )
);

CREATE OR REPLACE FUNCTION learning_delivery.validate_assignment_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  offering_course_version_id uuid;
  offering_status text;
  activity_course_version_id uuid;
  target_offering_id uuid;
BEGIN
  SELECT course_version_id, status
    INTO offering_course_version_id, offering_status
    FROM learning_delivery.learning_offerings
   WHERE organization_id = NEW.organization_id
     AND id = NEW.offering_id;

  IF offering_course_version_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'assignment requires a valid learning offering';
  END IF;

  IF TG_OP = 'INSERT' AND offering_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'new assignments require an open learning offering';
  END IF;

  SELECT course_version_id
    INTO activity_course_version_id
    FROM learning_content.course_version_activities
   WHERE organization_id = NEW.organization_id
     AND id = NEW.activity_version_id;

  IF activity_course_version_id IS DISTINCT FROM offering_course_version_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'assignment activity must belong to the learning offering course version';
  END IF;

  IF NEW.audience_type = 'course_run' THEN
    SELECT offering_id
      INTO target_offering_id
      FROM learning_delivery.course_runs
     WHERE organization_id = NEW.organization_id
       AND id = NEW.course_run_id;
  ELSIF NEW.audience_type = 'group' THEN
    SELECT cr.offering_id
      INTO target_offering_id
      FROM learning_delivery.groups g
      JOIN learning_delivery.group_sets gs
        ON gs.organization_id = g.organization_id
       AND gs.id = g.group_set_id
      JOIN learning_delivery.course_runs cr
        ON cr.organization_id = gs.organization_id
       AND cr.id = gs.course_run_id
     WHERE g.organization_id = NEW.organization_id
       AND g.id = NEW.group_id;
  ELSIF NEW.audience_type = 'enrollment' THEN
    SELECT offering_id
      INTO target_offering_id
      FROM learning_delivery.enrollments
     WHERE organization_id = NEW.organization_id
       AND id = NEW.enrollment_id;
  ELSE
    target_offering_id := NEW.offering_id;
  END IF;

  IF target_offering_id IS DISTINCT FROM NEW.offering_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'assignment audience must belong to the same learning offering';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.validate_assignment_scope() FROM PUBLIC;

CREATE TRIGGER assignments_10_validate_scope
BEFORE INSERT OR UPDATE OF
  organization_id,
  offering_id,
  activity_version_id,
  audience_type,
  course_run_id,
  group_id,
  enrollment_id
ON learning_delivery.assignments
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.validate_assignment_scope();

CREATE OR REPLACE FUNCTION learning_delivery.protect_assignment_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_user_id uuid;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.offering_id IS DISTINCT FROM OLD.offering_id
     OR NEW.activity_version_id IS DISTINCT FROM OLD.activity_version_id
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.name IS DISTINCT FROM OLD.name
     OR NEW.audience_type IS DISTINCT FROM OLD.audience_type
     OR NEW.course_run_id IS DISTINCT FROM OLD.course_run_id
     OR NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id
     OR NEW.available_at IS DISTINCT FROM OLD.available_at
     OR NEW.due_at IS DISTINCT FROM OLD.due_at
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'assignment delivery meaning is immutable';
  END IF;

  IF OLD.cancelled_at IS NOT NULL THEN
    IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
       OR NEW.cancelled_by_user_id IS DISTINCT FROM OLD.cancelled_by_user_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'cancelled assignment cannot be changed';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     OR NEW.cancelled_by_user_id IS DISTINCT FROM OLD.cancelled_by_user_id THEN
    IF NEW.cancelled_at IS NULL OR NEW.cancelled_by_user_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'assignment cancellation is a one-way complete transition';
    END IF;

    actor_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
    IF actor_user_id IS NULL
       OR NEW.cancelled_by_user_id IS DISTINCT FROM actor_user_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'assignment cancellation actor must match the transaction principal';
    END IF;

    NEW.cancelled_at := now();
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_assignment_history() FROM PUBLIC;

CREATE TRIGGER assignments_00_protect_history
BEFORE UPDATE ON learning_delivery.assignments
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_assignment_history();

CREATE INDEX assignments_offering_created_idx
  ON learning_delivery.assignments (organization_id, offering_id, created_at, id);
CREATE INDEX assignments_activity_idx
  ON learning_delivery.assignments (organization_id, activity_version_id, id);
CREATE INDEX assignments_course_run_idx
  ON learning_delivery.assignments (organization_id, course_run_id, id)
  WHERE course_run_id IS NOT NULL;
CREATE INDEX assignments_group_idx
  ON learning_delivery.assignments (organization_id, group_id, id)
  WHERE group_id IS NOT NULL;
CREATE INDEX assignments_enrollment_idx
  ON learning_delivery.assignments (organization_id, enrollment_id, id)
  WHERE enrollment_id IS NOT NULL;

GRANT SELECT, INSERT ON learning_delivery.assignments TO platform_app;
GRANT UPDATE (cancelled_at, cancelled_by_user_id)
  ON learning_delivery.assignments TO platform_app;

ALTER TABLE learning_delivery.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY assignments_app_tenant_policy
  ON learning_delivery.assignments
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
