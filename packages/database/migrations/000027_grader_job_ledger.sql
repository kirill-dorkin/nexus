-- F7: durable grader-job identity/provenance and worker lease state.
-- Execution remains disabled: this migration exposes claim/failure boundaries only.

CREATE TABLE learning_validation.grader_jobs (
  job_id text PRIMARY KEY
    CHECK (job_id ~ '^sha256:[0-9a-f]{64}$'),
  organization_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  validator_key text NOT NULL
    CHECK (
      char_length(validator_key) BETWEEN 2 AND 80
      AND validator_key ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
    ),
  validator_version integer NOT NULL CHECK (validator_version > 0),
  validator_config jsonb NOT NULL
    CHECK (jsonb_typeof(validator_config) = 'object'),
  profile_key text NOT NULL
    CHECK (
      char_length(profile_key) BETWEEN 2 AND 80
      AND profile_key ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
    ),
  profile_version integer NOT NULL CHECK (profile_version > 0),
  profile_fingerprint text NOT NULL
    CHECK (profile_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  request_payload jsonb NOT NULL
    CHECK (jsonb_typeof(request_payload) = 'object'),
  requested_by_user_id uuid REFERENCES identity.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES learning_progress.submissions(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, job_id),
  UNIQUE (organization_id, submission_id, validator_key, validator_version),
  CHECK (request_payload ->> 'jobId' = job_id),
  CHECK (request_payload ->> 'submissionId' = submission_id::text),
  CHECK (request_payload ->> 'activityVersionId' = activity_version_id::text),
  CHECK (request_payload #>> '{profile,key}' = profile_key),
  CHECK ((request_payload #>> '{profile,version}')::integer = profile_version)
);

CREATE TABLE learning_validation.grader_job_processing (
  job_id text PRIMARY KEY,
  organization_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'processing',
      'retryable',
      'completed',
      'system_error',
      'dead_letter'
    )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text
    CHECK (
      last_error_code IS NULL
      OR (
        char_length(last_error_code) BETWEEN 1 AND 100
        AND last_error_code ~ '^[a-z][a-z0-9_]*$'
      )
    ),
  last_error_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, job_id)
    REFERENCES learning_validation.grader_jobs(organization_id, job_id)
    ON DELETE CASCADE,
  CHECK (
    (status = 'processing' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR
    (status <> 'processing' AND lease_token IS NULL AND lease_expires_at IS NULL)
  ),
  CHECK (
    (status IN ('completed', 'system_error', 'dead_letter') AND finished_at IS NOT NULL)
    OR
    (status NOT IN ('completed', 'system_error', 'dead_letter') AND finished_at IS NULL)
  )
);

CREATE OR REPLACE FUNCTION learning_validation.validate_grader_job_context()
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
      MESSAGE = 'grader job activity must match the submission attempt activity';
  END IF;

  principal_user_id := NULLIF(current_setting('app.user_id', true), '')::uuid;
  IF principal_user_id IS NOT NULL
     AND NEW.requested_by_user_id IS DISTINCT FROM principal_user_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'grader job requester must match the transaction principal';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_validation.validate_grader_job_context() FROM PUBLIC;

CREATE TRIGGER grader_jobs_validate_context
BEFORE INSERT ON learning_validation.grader_jobs
FOR EACH ROW EXECUTE FUNCTION learning_validation.validate_grader_job_context();

CREATE OR REPLACE FUNCTION learning_validation.initialize_grader_job_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO learning_validation.grader_job_processing (
    job_id,
    organization_id,
    status,
    available_at
  ) VALUES (
    NEW.job_id,
    NEW.organization_id,
    'pending',
    now()
  );
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_validation.initialize_grader_job_processing() FROM PUBLIC;

CREATE TRIGGER grader_jobs_initialize_processing
AFTER INSERT ON learning_validation.grader_jobs
FOR EACH ROW EXECUTE FUNCTION learning_validation.initialize_grader_job_processing();

CREATE INDEX grader_jobs_submission_idx
  ON learning_validation.grader_jobs
    (organization_id, submission_id, created_at, job_id);

CREATE INDEX grader_job_processing_claim_idx
  ON learning_validation.grader_job_processing
    (available_at, job_id)
  WHERE status IN ('pending', 'retryable');

CREATE INDEX grader_job_processing_expired_lease_idx
  ON learning_validation.grader_job_processing
    (lease_expires_at, job_id)
  WHERE status = 'processing';

GRANT SELECT, INSERT ON learning_validation.grader_jobs TO platform_app;
GRANT SELECT ON learning_validation.grader_job_processing TO platform_app;

ALTER TABLE learning_validation.grader_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_validation.grader_job_processing ENABLE ROW LEVEL SECURITY;

CREATE POLICY grader_jobs_app_tenant_policy
  ON learning_validation.grader_jobs
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

CREATE POLICY grader_job_processing_app_select_policy
  ON learning_validation.grader_job_processing
  FOR SELECT
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id());

CREATE OR REPLACE FUNCTION platform_internal.claim_grader_job(p_lease_seconds integer)
RETURNS TABLE (
  job_id text,
  organization_id uuid,
  submission_id uuid,
  activity_version_id uuid,
  validator_key text,
  validator_version integer,
  validator_config jsonb,
  profile_key text,
  profile_version integer,
  profile_fingerprint text,
  request_payload jsonb,
  attempt_count integer,
  lease_token uuid,
  lease_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_lease_seconds < 1 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'grader job lease seconds must be between 1 and 900';
  END IF;

  UPDATE learning_validation.grader_job_processing AS exhausted
     SET status = 'dead_letter',
         lease_token = NULL,
         lease_expires_at = NULL,
         last_error_code = 'lease_expired_attempts_exhausted',
         last_error_at = now(),
         finished_at = now(),
         updated_at = now()
   WHERE exhausted.status = 'processing'
     AND exhausted.lease_expires_at <= now()
     AND exhausted.attempt_count >= 5;

  RETURN QUERY
  WITH candidate AS (
    SELECT processing.job_id
      FROM learning_validation.grader_job_processing AS processing
     WHERE processing.attempt_count < 5
       AND (
         (processing.status IN ('pending', 'retryable') AND processing.available_at <= now())
         OR
         (processing.status = 'processing' AND processing.lease_expires_at <= now())
       )
     ORDER BY processing.available_at, processing.job_id
     FOR UPDATE SKIP LOCKED
     LIMIT 1
  ), claimed AS (
    UPDATE learning_validation.grader_job_processing AS processing
       SET status = 'processing',
           attempt_count = processing.attempt_count + 1,
           lease_token = uuidv7(),
           lease_expires_at = now() + make_interval(secs => p_lease_seconds),
           last_error_code = NULL,
           last_error_at = NULL,
           updated_at = now()
      FROM candidate
     WHERE processing.job_id = candidate.job_id
     RETURNING
       processing.job_id,
       processing.attempt_count,
       processing.lease_token,
       processing.lease_expires_at
  )
  SELECT job.job_id,
         job.organization_id,
         job.submission_id,
         job.activity_version_id,
         job.validator_key,
         job.validator_version,
         job.validator_config,
         job.profile_key,
         job.profile_version,
         job.profile_fingerprint,
         job.request_payload,
         claimed.attempt_count,
         claimed.lease_token,
         claimed.lease_expires_at
    FROM claimed
    JOIN learning_validation.grader_jobs AS job
      ON job.job_id = claimed.job_id;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.claim_grader_job(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.claim_grader_job(integer) TO platform_worker;

CREATE OR REPLACE FUNCTION platform_internal.fail_grader_job(
  p_job_id text,
  p_lease_token uuid,
  p_error_code text,
  p_retry_at timestamptz
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  next_status text;
BEGIN
  IF p_error_code IS NULL
     OR char_length(p_error_code) NOT BETWEEN 1 AND 100
     OR p_error_code !~ '^[a-z][a-z0-9_]*$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'grader job error code is invalid';
  END IF;

  UPDATE learning_validation.grader_job_processing AS processing
     SET status = CASE
                    WHEN processing.attempt_count >= 5 THEN 'dead_letter'
                    ELSE 'retryable'
                  END,
         available_at = CASE
                          WHEN processing.attempt_count >= 5 THEN now()
                          ELSE GREATEST(p_retry_at, now())
                        END,
         lease_token = NULL,
         lease_expires_at = NULL,
         last_error_code = p_error_code,
         last_error_at = now(),
         finished_at = CASE
                         WHEN processing.attempt_count >= 5 THEN now()
                         ELSE NULL
                       END,
         updated_at = now()
   WHERE processing.job_id = p_job_id
     AND processing.status = 'processing'
     AND processing.lease_token = p_lease_token
  RETURNING processing.status INTO next_status;

  RETURN next_status;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.fail_grader_job(text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.fail_grader_job(text, uuid, text, timestamptz) TO platform_worker;
