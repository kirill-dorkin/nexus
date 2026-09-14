-- F4: split Attempt lifecycle from immutable Submission.
-- Historical embedded submissions are preserved and migrated losslessly.

ALTER TABLE learning_progress.attempts
  ALTER COLUMN submission DROP NOT NULL,
  ALTER COLUMN submission DROP DEFAULT,
  ALTER COLUMN submitted_at DROP NOT NULL,
  ALTER COLUMN submitted_at DROP DEFAULT;

CREATE TABLE learning_progress.submissions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  submitted_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, attempt_id)
    REFERENCES learning_progress.attempts(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (attempt_id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, id, attempt_id)
);

CREATE OR REPLACE FUNCTION learning_progress.validate_submission_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  learner_user_id uuid;
  principal_user_id uuid;
BEGIN
  SELECT enrollment.user_id
    INTO learner_user_id
    FROM learning_progress.attempts AS attempt
    JOIN learning_delivery.enrollments AS enrollment
      ON enrollment.organization_id = attempt.organization_id
     AND enrollment.id = attempt.enrollment_id
   WHERE attempt.organization_id = NEW.organization_id
     AND attempt.id = NEW.attempt_id;

  IF learner_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'submission requires a valid attempt enrollment';
  END IF;

  IF learner_user_id IS DISTINCT FROM NEW.submitted_by_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'submission actor must own the attempt enrollment';
  END IF;

  principal_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
  IF principal_user_id IS NOT NULL
     AND principal_user_id IS DISTINCT FROM NEW.submitted_by_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'submission actor must match the transaction principal';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_progress.validate_submission_context() FROM PUBLIC;

CREATE TRIGGER submissions_validate_context
BEFORE INSERT ON learning_progress.submissions
FOR EACH ROW EXECUTE FUNCTION learning_progress.validate_submission_context();

INSERT INTO learning_progress.submissions
  (organization_id, attempt_id, payload, submitted_by_user_id, submitted_at)
SELECT attempt.organization_id,
       attempt.id,
       attempt.submission,
       enrollment.user_id,
       attempt.submitted_at
  FROM learning_progress.attempts AS attempt
  JOIN learning_delivery.enrollments AS enrollment
    ON enrollment.organization_id = attempt.organization_id
   AND enrollment.id = attempt.enrollment_id
 WHERE attempt.submission IS NOT NULL
   AND attempt.submitted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION learning_progress.protect_new_attempt_shape()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  principal_user_id uuid;
BEGIN
  principal_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;

  IF principal_user_id IS NOT NULL
     AND (NEW.submission IS NOT NULL OR NEW.submitted_at IS NOT NULL) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'new attempts must persist learner work through submissions';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_progress.protect_new_attempt_shape() FROM PUBLIC;

CREATE TRIGGER attempts_require_separate_submission
BEFORE INSERT ON learning_progress.attempts
FOR EACH ROW EXECUTE FUNCTION learning_progress.protect_new_attempt_shape();

ALTER TABLE learning_progress.evidence
  ADD COLUMN submission_id uuid;

UPDATE learning_progress.evidence AS evidence
   SET submission_id = submission.id
  FROM learning_progress.submissions AS submission
 WHERE submission.organization_id = evidence.organization_id
   AND submission.attempt_id = evidence.attempt_id;

ALTER TABLE learning_progress.evidence
  ALTER COLUMN submission_id SET NOT NULL,
  ADD CONSTRAINT evidence_submission_attempt_fk
    FOREIGN KEY (organization_id, submission_id, attempt_id)
    REFERENCES learning_progress.submissions(organization_id, id, attempt_id)
    ON DELETE RESTRICT;

CREATE INDEX submissions_attempt_idx
  ON learning_progress.submissions (organization_id, attempt_id, submitted_at, id);

CREATE INDEX attempts_enrollment_started_idx
  ON learning_progress.attempts
    (organization_id, enrollment_id, created_at, id);

CREATE INDEX evidence_submission_idx
  ON learning_progress.evidence
    (organization_id, submission_id, created_at, id);

GRANT SELECT, INSERT ON learning_progress.submissions TO platform_app;

ALTER TABLE learning_progress.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY submissions_app_tenant_policy
  ON learning_progress.submissions
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
