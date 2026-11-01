-- Forward retarget of free self-paced Offerings (ADR-0062).
-- An Offering may move to a newer published CourseVersion of the same Course, so learners keep
-- their Enrollment, address and history when the curriculum is republished. Everything else about
-- Offering identity stays immutable, and published curriculum itself is untouched.
--
-- Only free self-paced membership Offerings without cohort or assignment structure may move:
-- course runs, sessions and assignments pin activities of the current version, and paid access
-- terms are out of scope for this slice. Attempts already pin their exact ActivityVersion and are
-- validated only at insert time, so recorded history stays valid after a move.

CREATE OR REPLACE FUNCTION learning_delivery.protect_learning_offering_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  old_course uuid;
  old_number integer;
  new_course uuid;
  new_number integer;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.delivery_mode IS DISTINCT FROM OLD.delivery_mode THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'learning offering content and delivery identity are immutable';
  END IF;

  IF NEW.course_version_id IS DISTINCT FROM OLD.course_version_id THEN
    SELECT course_id, version_number INTO old_course, old_number
      FROM learning_content.course_versions
     WHERE organization_id = OLD.organization_id AND id = OLD.course_version_id;
    SELECT course_id, version_number INTO new_course, new_number
      FROM learning_content.course_versions
     WHERE organization_id = NEW.organization_id AND id = NEW.course_version_id AND status = 'published';

    IF new_course IS NULL
       OR new_course IS DISTINCT FROM old_course
       OR new_number <= old_number
       OR NEW.delivery_mode <> 'self_paced'
       OR NEW.access_mode <> 'membership'
       OR EXISTS (SELECT 1 FROM learning_delivery.course_runs r
                   WHERE r.organization_id = NEW.organization_id AND r.offering_id = NEW.id)
       OR EXISTS (SELECT 1 FROM learning_delivery.assignments a
                   WHERE a.organization_id = NEW.organization_id AND a.offering_id = NEW.id) THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'learning offering can only move forward to a newer published version of the same course';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_delivery.protect_learning_offering_identity() FROM PUBLIC;

-- 000012 narrowed runtime UPDATE to lifecycle columns; the retarget column joins them under the trigger above.
GRANT UPDATE (course_version_id) ON learning_delivery.learning_offerings TO platform_app;
