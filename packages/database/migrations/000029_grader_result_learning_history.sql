-- F7: keep system-owned completed grader ValidationResults on the canonical learner-history path.
-- Evidence remains a separate Learning Progress normalization step.

CREATE OR REPLACE FUNCTION learning_history.append_grader_validation_result_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF NEW.grader_job_id IS NULL OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  INSERT INTO learning_history.learning_events (
    organization_id,
    learner_user_id,
    enrollment_id,
    event_name,
    attempt_id,
    activity_version_id,
    attempt_number,
    submission_id,
    validation_result_id,
    outcome,
    score,
    occurred_at
  )
  SELECT NEW.organization_id,
         enrollment.user_id,
         attempt.enrollment_id,
         'validation.result_recorded',
         attempt.id,
         NEW.activity_version_id,
         attempt.attempt_number,
         NEW.submission_id,
         NEW.id,
         NEW.outcome,
         NEW.score,
         NEW.recorded_at
    FROM learning_progress.submissions AS submission
    JOIN learning_progress.attempts AS attempt
      ON attempt.organization_id = submission.organization_id
     AND attempt.id = submission.attempt_id
    JOIN learning_delivery.enrollments AS enrollment
      ON enrollment.organization_id = attempt.organization_id
     AND enrollment.id = attempt.enrollment_id
   WHERE submission.organization_id = NEW.organization_id
     AND submission.id = NEW.submission_id
     AND attempt.activity_version_id = NEW.activity_version_id;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'completed grader ValidationResult must resolve to exactly one learner history context';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_history.append_grader_validation_result_event() FROM PUBLIC;

CREATE TRIGGER validation_results_append_grader_learning_event
AFTER INSERT ON learning_validation.validation_results
FOR EACH ROW
WHEN (NEW.grader_job_id IS NOT NULL AND NEW.status = 'completed')
EXECUTE FUNCTION learning_history.append_grader_validation_result_event();
