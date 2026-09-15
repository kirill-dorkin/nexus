-- Extend the canonical LearningEvent source validator for F5 guidance events.
-- Kept additive so the prior migration remains reviewable while this branch evolves.

CREATE OR REPLACE FUNCTION learning_history.validate_learning_event_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  canonical_occurred_at timestamptz;
BEGIN
  IF NEW.event_name = 'attempt.started' THEN
    SELECT attempt.created_at
      INTO canonical_occurred_at
      FROM learning_progress.attempts AS attempt
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id
       AND enrollment.id = attempt.enrollment_id
     WHERE attempt.organization_id = NEW.organization_id
       AND attempt.id = NEW.attempt_id
       AND attempt.enrollment_id = NEW.enrollment_id
       AND attempt.activity_version_id = NEW.activity_version_id
       AND attempt.attempt_number = NEW.attempt_number
       AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'attempt LearningEvent must match its canonical Attempt';
    END IF;
  ELSIF NEW.event_name = 'submission.submitted' THEN
    SELECT submission.submitted_at
      INTO canonical_occurred_at
      FROM learning_progress.submissions AS submission
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = submission.organization_id
       AND attempt.id = submission.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id
       AND enrollment.id = attempt.enrollment_id
     WHERE submission.organization_id = NEW.organization_id
       AND submission.id = NEW.submission_id
       AND submission.attempt_id = NEW.attempt_id
       AND attempt.enrollment_id = NEW.enrollment_id
       AND attempt.activity_version_id = NEW.activity_version_id
       AND attempt.attempt_number = NEW.attempt_number
       AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'submission LearningEvent must match its canonical Submission';
    END IF;
  ELSIF NEW.event_name = 'validation.result_recorded' THEN
    SELECT result.recorded_at
      INTO canonical_occurred_at
      FROM learning_validation.validation_results AS result
      JOIN learning_progress.submissions AS submission
        ON submission.organization_id = result.organization_id
       AND submission.id = result.submission_id
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = submission.organization_id
       AND attempt.id = submission.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id
       AND enrollment.id = attempt.enrollment_id
     WHERE result.organization_id = NEW.organization_id
       AND result.id = NEW.validation_result_id
       AND result.status = 'completed'
       AND result.submission_id = NEW.submission_id
       AND result.activity_version_id = NEW.activity_version_id
       AND result.outcome = NEW.outcome
       AND result.score IS NOT DISTINCT FROM NEW.score
       AND attempt.id = NEW.attempt_id
       AND attempt.enrollment_id = NEW.enrollment_id
       AND attempt.attempt_number = NEW.attempt_number
       AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'validation LearningEvent must match its completed ValidationResult';
    END IF;
  ELSIF NEW.event_name = 'evidence.recorded' THEN
    SELECT evidence.created_at
      INTO canonical_occurred_at
      FROM learning_progress.evidence AS evidence
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = evidence.organization_id
       AND attempt.id = evidence.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id
       AND enrollment.id = attempt.enrollment_id
     WHERE evidence.organization_id = NEW.organization_id
       AND evidence.id = NEW.evidence_id
       AND evidence.attempt_id = NEW.attempt_id
       AND evidence.submission_id = NEW.submission_id
       AND evidence.skill_id = NEW.skill_id
       AND evidence.kind = NEW.evidence_kind
       AND evidence.score IS NOT DISTINCT FROM NEW.score
       AND evidence.source_type = NEW.evidence_source_type
       AND evidence.source_validation_result_id IS NOT DISTINCT FROM NEW.validation_result_id
       AND attempt.enrollment_id = NEW.enrollment_id
       AND attempt.activity_version_id = NEW.activity_version_id
       AND attempt.attempt_number = NEW.attempt_number
       AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Evidence LearningEvent must match its canonical Evidence';
    END IF;
  ELSIF NEW.event_name IN ('guidance.hint_revealed', 'guidance.solution_revealed') THEN
    SELECT exposure.revealed_at
      INTO canonical_occurred_at
      FROM learning_guidance.guidance_exposures AS exposure
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = exposure.organization_id
       AND attempt.id = exposure.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id
       AND enrollment.id = attempt.enrollment_id
     WHERE exposure.organization_id = NEW.organization_id
       AND exposure.id = NEW.guidance_exposure_id
       AND exposure.enrollment_id = NEW.enrollment_id
       AND exposure.attempt_id = NEW.attempt_id
       AND exposure.activity_version_id = NEW.activity_version_id
       AND exposure.step_key IS NOT DISTINCT FROM NEW.guidance_step_key
       AND exposure.hint_key IS NOT DISTINCT FROM NEW.guidance_hint_key
       AND exposure.solution_key IS NOT DISTINCT FROM NEW.guidance_solution_key
       AND attempt.attempt_number = NEW.attempt_number
       AND enrollment.user_id = NEW.learner_user_id
       AND (
         (NEW.event_name = 'guidance.hint_revealed' AND exposure.kind = 'hint')
         OR
         (NEW.event_name = 'guidance.solution_revealed' AND exposure.kind = 'professional_solution')
       );
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Guidance LearningEvent must match its canonical GuidanceExposure';
    END IF;
  END IF;

  NEW.occurred_at := canonical_occurred_at;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_history.validate_learning_event_source() FROM PUBLIC;
