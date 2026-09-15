-- F4: immutable validator attribution and ValidationResult persistence.

CREATE SCHEMA learning_validation;

REVOKE ALL ON SCHEMA learning_validation FROM PUBLIC;
GRANT USAGE ON SCHEMA learning_validation TO platform_app;

CREATE TABLE learning_validation.validation_results (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  validator_key text NOT NULL
    CHECK (
      char_length(validator_key) BETWEEN 2 AND 80
      AND validator_key ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
    ),
  validator_version integer NOT NULL CHECK (validator_version > 0),
  validator_config jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(validator_config) = 'object'),
  idempotency_key text NOT NULL
    CHECK (char_length(btrim(idempotency_key)) BETWEEN 1 AND 200),
  status text NOT NULL CHECK (status IN ('completed', 'system_error')),
  outcome text CHECK (outcome IN ('passed', 'failed', 'needs_review')),
  score numeric(6,5) CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  evidence_trust text NOT NULL CHECK (evidence_trust IN ('trusted', 'advisory')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  recorded_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES learning_progress.submissions(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (
    organization_id,
    submission_id,
    validator_key,
    validator_version,
    idempotency_key
  ),
  CHECK (
    (status = 'completed' AND outcome IS NOT NULL)
    OR
    (status = 'system_error' AND outcome IS NULL AND score IS NULL)
  )
);

CREATE OR REPLACE FUNCTION learning_validation.validate_result_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  principal_user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM learning_progress.submissions AS submission
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = submission.organization_id
       AND attempt.id = submission.attempt_id
     WHERE submission.organization_id = NEW.organization_id
       AND submission.id = NEW.submission_id
       AND attempt.activity_version_id = NEW.activity_version_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'validation result activity must match the submission attempt activity';
  END IF;

  principal_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
  IF principal_user_id IS NOT NULL
     AND NEW.recorded_by_user_id IS DISTINCT FROM principal_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'validation result actor must match the transaction principal';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_validation.validate_result_context() FROM PUBLIC;

CREATE TRIGGER validation_results_validate_context
BEFORE INSERT ON learning_validation.validation_results
FOR EACH ROW EXECUTE FUNCTION learning_validation.validate_result_context();

CREATE INDEX validation_results_submission_idx
  ON learning_validation.validation_results
    (organization_id, submission_id, recorded_at, id);

CREATE INDEX validation_results_activity_idx
  ON learning_validation.validation_results
    (organization_id, activity_version_id, recorded_at, id);

GRANT SELECT, INSERT ON learning_validation.validation_results TO platform_app;

ALTER TABLE learning_validation.validation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY validation_results_app_tenant_policy
  ON learning_validation.validation_results
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
