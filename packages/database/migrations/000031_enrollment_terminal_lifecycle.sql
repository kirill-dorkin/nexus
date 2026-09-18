CREATE OR REPLACE FUNCTION learning_delivery.protect_enrollment_terminal_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'active' THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'terminal enrollment status is immutable';
    END IF;

    IF NEW.status NOT IN ('completed', 'withdrawn', 'cancelled') THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'active enrollment may transition only to a terminal status';
    END IF;
  END IF;

  IF OLD.status = 'completed'
     AND NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'enrollment completion timestamp is immutable';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_enrollment_terminal_lifecycle()
FROM PUBLIC;

CREATE TRIGGER enrollments_10_protect_terminal_lifecycle
BEFORE UPDATE OF status, completed_at
ON learning_delivery.enrollments
FOR EACH ROW
EXECUTE FUNCTION learning_delivery.protect_enrollment_terminal_lifecycle();
