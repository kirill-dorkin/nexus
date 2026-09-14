-- Harden delivery history against later mutations that could invalidate already-recorded facts.
-- This follows 000010 rather than rewriting it so databases that already applied the slice can migrate forward safely.

CREATE OR REPLACE FUNCTION learning_delivery.protect_learning_offering_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.course_version_id IS DISTINCT FROM OLD.course_version_id
     OR NEW.delivery_mode IS DISTINCT FROM OLD.delivery_mode THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'learning offering content and delivery identity are immutable';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_learning_offering_identity() FROM PUBLIC;

CREATE TRIGGER learning_offerings_00_protect_identity
BEFORE UPDATE ON learning_delivery.learning_offerings
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_learning_offering_identity();

CREATE OR REPLACE FUNCTION learning_delivery.validate_offering_course_run_dependents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at THEN
    IF EXISTS (
      SELECT 1
        FROM learning_delivery.course_runs cr
       WHERE cr.organization_id = OLD.organization_id
         AND cr.offering_id = OLD.id
         AND (
           (NEW.starts_at IS NOT NULL AND cr.starts_at < NEW.starts_at)
           OR (NEW.ends_at IS NOT NULL AND cr.ends_at > NEW.ends_at)
         )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'learning offering schedule cannot exclude an existing course run';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.validate_offering_course_run_dependents() FROM PUBLIC;

CREATE TRIGGER learning_offerings_10_validate_course_runs
BEFORE UPDATE OF starts_at, ends_at ON learning_delivery.learning_offerings
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.validate_offering_course_run_dependents();

CREATE OR REPLACE FUNCTION learning_delivery.protect_course_run_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.offering_id IS DISTINCT FROM OLD.offering_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'course run offering identity is immutable';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_course_run_identity() FROM PUBLIC;

CREATE TRIGGER course_runs_00_protect_identity
BEFORE UPDATE ON learning_delivery.course_runs
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_course_run_identity();

CREATE OR REPLACE FUNCTION learning_delivery.validate_course_run_session_dependents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at THEN
    IF EXISTS (
      SELECT 1
        FROM learning_delivery.sessions s
       WHERE s.organization_id = OLD.organization_id
         AND s.course_run_id = OLD.id
         AND (s.starts_at < NEW.starts_at OR s.ends_at > NEW.ends_at)
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'course run schedule cannot exclude an existing session';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.validate_course_run_session_dependents() FROM PUBLIC;

CREATE TRIGGER course_runs_10_validate_sessions
BEFORE UPDATE OF starts_at, ends_at ON learning_delivery.course_runs
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.validate_course_run_session_dependents();

CREATE OR REPLACE FUNCTION learning_delivery.protect_group_set_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.course_run_id IS DISTINCT FROM OLD.course_run_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'group set course run identity is immutable';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_group_set_identity() FROM PUBLIC;

CREATE TRIGGER group_sets_00_protect_identity
BEFORE UPDATE ON learning_delivery.group_sets
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_group_set_identity();

CREATE OR REPLACE FUNCTION learning_delivery.protect_group_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.group_set_id IS DISTINCT FROM OLD.group_set_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'group group-set identity is immutable';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_group_identity() FROM PUBLIC;

CREATE TRIGGER groups_00_protect_identity
BEFORE UPDATE ON learning_delivery.groups
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_group_identity();

CREATE OR REPLACE FUNCTION learning_delivery.protect_enrollment_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.offering_id IS DISTINCT FROM OLD.offering_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.enrolled_at IS DISTINCT FROM OLD.enrolled_at
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'enrollment participation identity is immutable';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_enrollment_identity() FROM PUBLIC;

CREATE TRIGGER enrollments_00_protect_identity
BEFORE UPDATE ON learning_delivery.enrollments
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_enrollment_identity();

CREATE OR REPLACE FUNCTION learning_delivery.protect_group_membership_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.group_set_id IS DISTINCT FROM OLD.group_set_id
     OR NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id
     OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
     OR NEW.assigned_by_user_id IS DISTINCT FROM OLD.assigned_by_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'group membership assignment identity is immutable';
  END IF;

  IF NEW.ended_at IS DISTINCT FROM OLD.ended_at
     AND EXISTS (
       SELECT 1
         FROM learning_delivery.attendances a
         JOIN learning_delivery.sessions s
           ON s.organization_id = a.organization_id
          AND s.id = a.session_id
        WHERE a.organization_id = OLD.organization_id
          AND a.enrollment_id = OLD.enrollment_id
          AND s.group_id = OLD.group_id
          AND NOT (
            OLD.assigned_at <= s.starts_at
            AND (NEW.ended_at IS NULL OR NEW.ended_at > s.starts_at)
          )
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'group membership end cannot invalidate recorded attendance';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_group_membership_history() FROM PUBLIC;

CREATE TRIGGER group_memberships_00_protect_history
BEFORE UPDATE ON learning_delivery.group_memberships
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_group_membership_history();

CREATE OR REPLACE FUNCTION learning_delivery.protect_session_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.course_run_id IS DISTINCT FROM OLD.course_run_id
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'session course-run identity is immutable';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_session_identity() FROM PUBLIC;

CREATE TRIGGER sessions_00_protect_identity
BEFORE UPDATE ON learning_delivery.sessions
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_session_identity();

CREATE OR REPLACE FUNCTION learning_delivery.validate_session_attendance_dependents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
    IF EXISTS (
      SELECT 1
        FROM learning_delivery.attendances a
        JOIN learning_delivery.enrollments e
          ON e.organization_id = a.organization_id
         AND e.id = a.enrollment_id
       WHERE a.organization_id = OLD.organization_id
         AND a.session_id = OLD.id
         AND (
           e.enrolled_at > NEW.starts_at
           OR (
             NEW.group_id IS NOT NULL
             AND NOT EXISTS (
               SELECT 1
                 FROM learning_delivery.group_memberships gm
                WHERE gm.organization_id = OLD.organization_id
                  AND gm.group_id = NEW.group_id
                  AND gm.enrollment_id = a.enrollment_id
                  AND gm.assigned_at <= NEW.starts_at
                  AND (gm.ended_at IS NULL OR gm.ended_at > NEW.starts_at)
             )
           )
         )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'session rescheduling or regrouping cannot invalidate recorded attendance';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.validate_session_attendance_dependents() FROM PUBLIC;

CREATE TRIGGER sessions_10_validate_attendance
BEFORE UPDATE OF group_id, starts_at ON learning_delivery.sessions
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.validate_session_attendance_dependents();

CREATE OR REPLACE FUNCTION learning_delivery.protect_attendance_identity()
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
     OR NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id
     OR NEW.recorded_at IS DISTINCT FROM OLD.recorded_at
     OR NEW.recorded_by_user_id IS DISTINCT FROM OLD.recorded_by_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'attendance observation identity is immutable';
  END IF;

  actor_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF actor_user_id IS NOT NULL
       AND NEW.updated_by_user_id IS DISTINCT FROM actor_user_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'attendance correction actor must match the transaction principal';
    END IF;
  ELSIF NEW.updated_by_user_id IS DISTINCT FROM OLD.updated_by_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'attendance updater cannot change without a status correction';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_attendance_identity() FROM PUBLIC;

CREATE TRIGGER attendances_00_protect_identity
BEFORE UPDATE ON learning_delivery.attendances
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_attendance_identity();
