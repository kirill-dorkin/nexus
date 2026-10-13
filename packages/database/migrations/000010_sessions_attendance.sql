-- Scheduled instructor-led sessions and auditable attendance.
-- Session is operational delivery, not curriculum Activity; Attendance references Enrollment.

CREATE TABLE learning_delivery.sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  course_run_id uuid NOT NULL,
  group_id uuid,
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
  FOREIGN KEY (organization_id, course_run_id)
    REFERENCES learning_delivery.course_runs(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, group_id)
    REFERENCES learning_delivery.groups(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (course_run_id, slug),
  UNIQUE (organization_id, id),
  CHECK (ends_at > starts_at)
);

CREATE OR REPLACE FUNCTION learning_delivery.validate_session_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  run_starts_at timestamptz;
  run_ends_at timestamptz;
  group_course_run_id uuid;
BEGIN
  SELECT starts_at, ends_at
    INTO run_starts_at, run_ends_at
    FROM learning_delivery.course_runs
   WHERE organization_id = NEW.organization_id
     AND id = NEW.course_run_id;

  IF run_starts_at IS NOT NULL AND NEW.starts_at < run_starts_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'session cannot start before its course run';
  END IF;

  IF run_ends_at IS NOT NULL AND NEW.ends_at > run_ends_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'session cannot end after its course run';
  END IF;

  IF NEW.group_id IS NOT NULL THEN
    SELECT gs.course_run_id
      INTO group_course_run_id
      FROM learning_delivery.groups g
      JOIN learning_delivery.group_sets gs
        ON gs.organization_id = g.organization_id
       AND gs.id = g.group_set_id
     WHERE g.organization_id = NEW.organization_id
       AND g.id = NEW.group_id;

    IF group_course_run_id IS DISTINCT FROM NEW.course_run_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'session group must belong to the same course run';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.validate_session_scope() FROM PUBLIC;

CREATE TRIGGER sessions_validate_scope
BEFORE INSERT OR UPDATE OF organization_id, course_run_id, group_id, starts_at, ends_at
ON learning_delivery.sessions
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.validate_session_scope();

CREATE TABLE learning_delivery.attendances (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  status text NOT NULL
    CHECK (status IN ('present', 'absent', 'late', 'excused')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, session_id)
    REFERENCES learning_delivery.sessions(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, enrollment_id)
    REFERENCES learning_delivery.enrollments(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (session_id, enrollment_id),
  UNIQUE (organization_id, id)
);

CREATE OR REPLACE FUNCTION learning_delivery.validate_attendance_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  session_offering_id uuid;
  session_group_id uuid;
  session_starts_at timestamptz;
  enrollment_offering_id uuid;
  enrollment_enrolled_at timestamptz;
  has_group_membership boolean;
BEGIN
  SELECT cr.offering_id, s.group_id, s.starts_at
    INTO session_offering_id, session_group_id, session_starts_at
    FROM learning_delivery.sessions s
    JOIN learning_delivery.course_runs cr
      ON cr.organization_id = s.organization_id
     AND cr.id = s.course_run_id
   WHERE s.organization_id = NEW.organization_id
     AND s.id = NEW.session_id;

  SELECT offering_id, enrolled_at
    INTO enrollment_offering_id, enrollment_enrolled_at
    FROM learning_delivery.enrollments
   WHERE organization_id = NEW.organization_id
     AND id = NEW.enrollment_id;

  IF enrollment_offering_id IS DISTINCT FROM session_offering_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'attendance enrollment must belong to the session course run offering';
  END IF;

  IF enrollment_enrolled_at IS NULL OR enrollment_enrolled_at > session_starts_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'attendance requires enrollment by the session start';
  END IF;

  IF session_group_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
        FROM learning_delivery.group_memberships gm
       WHERE gm.organization_id = NEW.organization_id
         AND gm.group_id = session_group_id
         AND gm.enrollment_id = NEW.enrollment_id
         AND gm.assigned_at <= session_starts_at
         AND (gm.ended_at IS NULL OR gm.ended_at > session_starts_at)
    ) INTO has_group_membership;

    IF has_group_membership IS NOT TRUE THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'group-scoped attendance requires group membership at session start';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.validate_attendance_scope() FROM PUBLIC;

CREATE TRIGGER attendances_validate_scope
BEFORE INSERT OR UPDATE OF organization_id, session_id, enrollment_id
ON learning_delivery.attendances
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.validate_attendance_scope();

CREATE TABLE learning_delivery.attendance_revisions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL
    REFERENCES organizations.organizations(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL,
  previous_status text NOT NULL
    CHECK (previous_status IN ('present', 'absent', 'late', 'excused')),
  new_status text NOT NULL
    CHECK (new_status IN ('present', 'absent', 'late', 'excused')),
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by_user_id uuid REFERENCES identity.users(id) ON DELETE SET NULL,
  FOREIGN KEY (organization_id, attendance_id)
    REFERENCES learning_delivery.attendances(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, id)
);

CREATE OR REPLACE FUNCTION learning_delivery.capture_attendance_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  actor_user_id uuid;
BEGIN
  NEW.updated_at := now();

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    actor_user_id := COALESCE(
      NULLIF(current_setting('app.user_id', true), '')::uuid,
      NEW.updated_by_user_id
    );

    INSERT INTO learning_delivery.attendance_revisions
      (organization_id, attendance_id, previous_status, new_status, changed_by_user_id)
    VALUES
      (NEW.organization_id, NEW.id, OLD.status, NEW.status, actor_user_id);
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.capture_attendance_revision() FROM PUBLIC;

CREATE TRIGGER attendances_capture_revision
BEFORE UPDATE
ON learning_delivery.attendances
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.capture_attendance_revision();

CREATE INDEX sessions_run_schedule_idx
  ON learning_delivery.sessions (organization_id, course_run_id, starts_at, id);
CREATE INDEX sessions_group_schedule_idx
  ON learning_delivery.sessions (organization_id, group_id, starts_at, id)
  WHERE group_id IS NOT NULL;
CREATE INDEX attendances_enrollment_idx
  ON learning_delivery.attendances (organization_id, enrollment_id, session_id);
CREATE INDEX attendance_revisions_attendance_idx
  ON learning_delivery.attendance_revisions (organization_id, attendance_id, changed_at, id);
CREATE INDEX group_memberships_group_enrollment_time_idx
  ON learning_delivery.group_memberships
    (organization_id, group_id, enrollment_id, assigned_at, ended_at);

GRANT SELECT, INSERT, UPDATE ON learning_delivery.sessions TO platform_app;
GRANT SELECT, INSERT, UPDATE ON learning_delivery.attendances TO platform_app;
GRANT SELECT ON learning_delivery.attendance_revisions TO platform_app;

ALTER TABLE learning_delivery.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_delivery.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_delivery.attendance_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_app_tenant_policy
  ON learning_delivery.sessions
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY attendances_app_tenant_policy
  ON learning_delivery.attendances
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY attendance_revisions_app_tenant_policy
  ON learning_delivery.attendance_revisions
  FOR SELECT
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id());