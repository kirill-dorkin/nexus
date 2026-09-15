-- Preserve GuidanceExposure serialization without widening platform_app privileges.
-- SELECT ... FOR UPDATE requires UPDATE privilege, which platform_app intentionally
-- does not have on append-only Attempt rows. The validator therefore runs with the
-- migration owner's privileges, but explicitly re-establishes the tenant boundary
-- before any privileged read or row lock.

CREATE OR REPLACE FUNCTION learning_guidance.validate_guidance_exposure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  principal_organization_id uuid;
  canonical_enrollment_id uuid;
  canonical_activity_version_id uuid;
  learner_user_id uuid;
  principal_user_id uuid;
  hint_position integer;
BEGIN
  principal_organization_id := NULLIF(current_setting('app.organization_id', true), '')::uuid;
  IF principal_organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'GuidanceExposure organization must match the transaction tenant';
  END IF;

  SELECT attempt.enrollment_id, attempt.activity_version_id, enrollment.user_id
    INTO canonical_enrollment_id, canonical_activity_version_id, learner_user_id
    FROM learning_progress.attempts AS attempt
    JOIN learning_delivery.enrollments AS enrollment
      ON enrollment.organization_id = attempt.organization_id
     AND enrollment.id = attempt.enrollment_id
   WHERE attempt.organization_id = NEW.organization_id
     AND attempt.id = NEW.attempt_id
   FOR UPDATE OF attempt;

  IF canonical_enrollment_id IS NULL
     OR canonical_enrollment_id IS DISTINCT FROM NEW.enrollment_id
     OR canonical_activity_version_id IS DISTINCT FROM NEW.activity_version_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'GuidanceExposure must match its canonical Attempt context';
  END IF;

  IF learner_user_id IS DISTINCT FROM NEW.revealed_by_user_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'GuidanceExposure actor must own the Attempt enrollment';
  END IF;

  principal_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
  IF principal_user_id IS NOT NULL AND principal_user_id IS DISTINCT FROM NEW.revealed_by_user_id THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'GuidanceExposure actor must match the transaction principal';
  END IF;

  IF NEW.kind = 'hint' THEN
    IF EXISTS (
      SELECT 1 FROM learning_progress.submissions AS submission
       WHERE submission.organization_id = NEW.organization_id
         AND submission.attempt_id = NEW.attempt_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Guided Build hints cannot be revealed after Submission';
    END IF;

    SELECT hint.position
      INTO hint_position
      FROM learning_content.guided_build_hints AS hint
     WHERE hint.organization_id = NEW.organization_id
       AND hint.activity_version_id = NEW.activity_version_id
       AND hint.step_key = NEW.step_key
       AND hint.hint_key = NEW.hint_key;

    IF hint_position IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'GuidanceExposure hint must reference protected Guided Build content';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM learning_content.guided_build_hints AS previous_hint
       WHERE previous_hint.organization_id = NEW.organization_id
         AND previous_hint.activity_version_id = NEW.activity_version_id
         AND previous_hint.step_key = NEW.step_key
         AND previous_hint.position < hint_position
         AND NOT EXISTS (
           SELECT 1
             FROM learning_guidance.guidance_exposures AS exposure
            WHERE exposure.organization_id = NEW.organization_id
              AND exposure.attempt_id = NEW.attempt_id
              AND exposure.kind = 'hint'
              AND exposure.hint_key = previous_hint.hint_key
         )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Guided Build hints must be revealed in ladder order';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM learning_progress.submissions AS submission
       WHERE submission.organization_id = NEW.organization_id
         AND submission.attempt_id = NEW.attempt_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Professional solution requires an immutable Submission';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_guidance.validate_guidance_exposure() FROM PUBLIC;
