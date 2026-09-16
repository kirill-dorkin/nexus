-- F7: authenticated grader dispatch terminal acknowledgement and system-owned results.

ALTER TABLE learning_validation.grader_jobs
  ADD COLUMN evidence_trust text NOT NULL DEFAULT 'trusted'
    CHECK (evidence_trust IN ('trusted', 'advisory'));

ALTER TABLE learning_validation.grader_jobs
  ALTER COLUMN evidence_trust DROP DEFAULT;

ALTER TABLE learning_validation.validation_results
  ADD COLUMN grader_job_id text;

ALTER TABLE learning_validation.validation_results
  ADD CONSTRAINT validation_results_grader_job_fk
    FOREIGN KEY (grader_job_id)
    REFERENCES learning_validation.grader_jobs(job_id)
    ON DELETE RESTRICT;

CREATE UNIQUE INDEX validation_results_grader_job_uq
  ON learning_validation.validation_results (grader_job_id)
  WHERE grader_job_id IS NOT NULL;

ALTER TABLE learning_validation.grader_job_processing
  ADD COLUMN validation_result_id uuid;

ALTER TABLE learning_validation.grader_job_processing
  ADD CONSTRAINT grader_job_processing_validation_result_fk
    FOREIGN KEY (organization_id, validation_result_id)
    REFERENCES learning_validation.validation_results(organization_id, id)
    ON DELETE RESTRICT;

-- Application callers may keep recording authorized-user results, but only the
-- worker SECURITY DEFINER boundary may attach grader-job provenance.
REVOKE INSERT ON learning_validation.validation_results FROM platform_app;
GRANT INSERT (
  id,
  organization_id,
  submission_id,
  activity_version_id,
  validator_key,
  validator_version,
  validator_config,
  idempotency_key,
  status,
  outcome,
  score,
  evidence_trust,
  payload,
  recorded_by_user_id
) ON learning_validation.validation_results TO platform_app;

CREATE OR REPLACE FUNCTION learning_validation.validate_grader_result_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.grader_job_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.recorded_by_user_id IS NOT NULL
     OR NEW.idempotency_key IS DISTINCT FROM 'grader-job:' || NEW.grader_job_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'grader validation results must be system-owned with deterministic idempotency';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM learning_validation.grader_jobs AS job
     WHERE job.job_id = NEW.grader_job_id
       AND job.organization_id = NEW.organization_id
       AND job.submission_id = NEW.submission_id
       AND job.activity_version_id = NEW.activity_version_id
       AND job.validator_key = NEW.validator_key
       AND job.validator_version = NEW.validator_version
       AND job.validator_config = NEW.validator_config
       AND job.evidence_trust = NEW.evidence_trust
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'grader validation result provenance does not match the immutable grader job';
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_validation.validate_grader_result_source() FROM PUBLIC;

CREATE TRIGGER validation_results_validate_grader_source
BEFORE INSERT ON learning_validation.validation_results
FOR EACH ROW EXECUTE FUNCTION learning_validation.validate_grader_result_source();

CREATE OR REPLACE FUNCTION learning_validation.persist_grader_validation_result(
  p_job_id text,
  p_result jsonb,
  p_terminal_state text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  job learning_validation.grader_jobs%ROWTYPE;
  existing learning_validation.validation_results%ROWTYPE;
  result_id uuid;
  result_status text;
  result_outcome text;
  result_score numeric(6,5);
  result_payload jsonb;
BEGIN
  IF p_result IS NULL
     OR jsonb_typeof(p_result) IS DISTINCT FROM 'object'
     OR p_result -> 'protocolVersion' IS DISTINCT FROM '1'::jsonb
     OR p_result ->> 'jobId' IS DISTINCT FROM p_job_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'grader terminal result identity is invalid';
  END IF;

  SELECT * INTO job
    FROM learning_validation.grader_jobs
   WHERE job_id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'grader job does not exist';
  END IF;

  result_status := p_result ->> 'status';

  IF result_status = 'completed' THEN
    IF p_terminal_state IS DISTINCT FROM 'completed'
       OR jsonb_object_length(p_result) <> 6
       OR NOT (p_result ?& ARRAY[
         'protocolVersion', 'jobId', 'status', 'outcome', 'score', 'payload'
       ])
       OR p_result ->> 'outcome' IS NULL
       OR p_result ->> 'outcome' NOT IN ('passed', 'failed', 'needs_review')
       OR jsonb_typeof(p_result -> 'payload') IS DISTINCT FROM 'object'
       OR NOT (p_result ? 'score')
       OR (
         p_result -> 'score' IS DISTINCT FROM 'null'::jsonb
         AND (
           jsonb_typeof(p_result -> 'score') IS DISTINCT FROM 'number'
           OR (p_result ->> 'score')::numeric < 0
           OR (p_result ->> 'score')::numeric > 1
         )
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'completed grader terminal result is invalid';
    END IF;

    result_outcome := p_result ->> 'outcome';
    result_score := CASE
                      WHEN p_result -> 'score' = 'null'::jsonb THEN NULL
                      ELSE (p_result ->> 'score')::numeric
                    END;
    result_payload := jsonb_build_object(
      'graderJobId', job.job_id,
      'protocolVersion', 1,
      'profile', jsonb_build_object(
        'key', job.profile_key,
        'version', job.profile_version,
        'fingerprint', job.profile_fingerprint
      ),
      'terminalState', p_terminal_state,
      'result', p_result -> 'payload'
    );
  ELSIF result_status = 'system_error' THEN
    IF p_terminal_state IS NULL
       OR p_terminal_state NOT IN ('system_error', 'dead_letter')
       OR jsonb_object_length(p_result) <> 4
       OR NOT (p_result ?& ARRAY['protocolVersion', 'jobId', 'status', 'error'])
       OR jsonb_typeof(p_result -> 'error') IS DISTINCT FROM 'object'
       OR jsonb_object_length(p_result -> 'error') <> 2
       OR NOT ((p_result -> 'error') ?& ARRAY['code', 'retryable'])
       OR p_result #>> '{error,code}' IS NULL
       OR char_length(p_result #>> '{error,code}') NOT BETWEEN 1 AND 100
       OR (p_result #>> '{error,code}') !~ '^[a-z][a-z0-9_]*$'
       OR jsonb_typeof(p_result #> '{error,retryable}') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'system_error grader terminal result is invalid';
    END IF;

    result_outcome := NULL;
    result_score := NULL;
    result_payload := jsonb_build_object(
      'graderJobId', job.job_id,
      'protocolVersion', 1,
      'profile', jsonb_build_object(
        'key', job.profile_key,
        'version', job.profile_version,
        'fingerprint', job.profile_fingerprint
      ),
      'terminalState', p_terminal_state,
      'error', p_result -> 'error'
    );
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'grader terminal result status is invalid';
  END IF;

  SELECT * INTO existing
    FROM learning_validation.validation_results
   WHERE grader_job_id = p_job_id;

  IF FOUND THEN
    IF existing.organization_id IS DISTINCT FROM job.organization_id
       OR existing.submission_id IS DISTINCT FROM job.submission_id
       OR existing.activity_version_id IS DISTINCT FROM job.activity_version_id
       OR existing.validator_key IS DISTINCT FROM job.validator_key
       OR existing.validator_version IS DISTINCT FROM job.validator_version
       OR existing.validator_config IS DISTINCT FROM job.validator_config
       OR existing.idempotency_key IS DISTINCT FROM 'grader-job:' || job.job_id
       OR existing.status IS DISTINCT FROM result_status
       OR existing.outcome IS DISTINCT FROM result_outcome
       OR existing.score IS DISTINCT FROM result_score
       OR existing.evidence_trust IS DISTINCT FROM job.evidence_trust
       OR existing.payload IS DISTINCT FROM result_payload
       OR existing.recorded_by_user_id IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'grader job is already bound to a materially different validation result';
    END IF;

    RETURN existing.id;
  END IF;

  result_id := uuidv7();

  INSERT INTO learning_validation.validation_results (
    id,
    organization_id,
    submission_id,
    activity_version_id,
    validator_key,
    validator_version,
    validator_config,
    idempotency_key,
    status,
    outcome,
    score,
    evidence_trust,
    payload,
    recorded_by_user_id,
    grader_job_id
  ) VALUES (
    result_id,
    job.organization_id,
    job.submission_id,
    job.activity_version_id,
    job.validator_key,
    job.validator_version,
    job.validator_config,
    'grader-job:' || job.job_id,
    result_status,
    result_outcome,
    result_score,
    job.evidence_trust,
    result_payload,
    NULL,
    job.job_id
  );

  INSERT INTO events.outbox (
    organization_id,
    event_name,
    event_version,
    aggregate_type,
    aggregate_id,
    actor_user_id,
    payload,
    metadata,
    idempotency_key
  ) VALUES (
    job.organization_id,
    'validation.result_recorded',
    1,
    'validation_result',
    result_id,
    NULL,
    jsonb_build_object(
      'organizationId', job.organization_id,
      'validationResultId', result_id,
      'submissionId', job.submission_id,
      'activityVersionId', job.activity_version_id,
      'validatorKey', job.validator_key,
      'validatorVersion', job.validator_version,
      'status', result_status,
      'outcome', result_outcome,
      'score', result_score,
      'evidenceTrust', job.evidence_trust
    ),
    '{}'::jsonb,
    'validation-result:' || result_id::text
  );

  RETURN result_id;
END
$$;

REVOKE ALL ON FUNCTION learning_validation.persist_grader_validation_result(text, jsonb, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION platform_internal.acknowledge_grader_job(
  p_job_id text,
  p_lease_token uuid,
  p_result jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  processing learning_validation.grader_job_processing%ROWTYPE;
  result_id uuid;
  next_status text;
BEGIN
  SELECT * INTO processing
    FROM learning_validation.grader_job_processing
   WHERE job_id = p_job_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- A commit-uncertain replay may safely rediscover the identical terminal result.
  IF processing.status IN ('completed', 'system_error', 'dead_letter')
     AND processing.validation_result_id IS NOT NULL THEN
    result_id := learning_validation.persist_grader_validation_result(
      p_job_id,
      p_result,
      processing.status
    );
    IF result_id = processing.validation_result_id THEN
      RETURN result_id;
    END IF;
    RETURN NULL;
  END IF;

  IF processing.status <> 'processing'
     OR processing.lease_token IS DISTINCT FROM p_lease_token
     OR processing.lease_expires_at <= now() THEN
    RETURN NULL;
  END IF;

  next_status := p_result ->> 'status';
  IF next_status IS NULL OR next_status NOT IN ('completed', 'system_error') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'grader terminal acknowledgement status is invalid';
  END IF;

  IF next_status = 'system_error'
     AND p_result #> '{error,retryable}' IS NOT DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'retryable grader system_error must use the durable failure lifecycle';
  END IF;

  result_id := learning_validation.persist_grader_validation_result(
    p_job_id,
    p_result,
    next_status
  );

  UPDATE learning_validation.grader_job_processing
     SET status = next_status,
         validation_result_id = result_id,
         lease_token = NULL,
         lease_expires_at = NULL,
         last_error_code = CASE
                             WHEN next_status = 'system_error'
                               THEN p_result #>> '{error,code}'
                             ELSE NULL
                           END,
         last_error_at = CASE
                           WHEN next_status = 'system_error' THEN now()
                           ELSE NULL
                         END,
         finished_at = now(),
         updated_at = now()
   WHERE job_id = p_job_id;

  RETURN result_id;
END
$$;

REVOKE ALL ON FUNCTION platform_internal.acknowledge_grader_job(text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.acknowledge_grader_job(text, uuid, jsonb) TO platform_worker;

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
  processing learning_validation.grader_job_processing%ROWTYPE;
  result_id uuid;
  terminal_result jsonb;
BEGIN
  IF p_error_code IS NULL
     OR char_length(p_error_code) NOT BETWEEN 1 AND 100
     OR p_error_code !~ '^[a-z][a-z0-9_]*$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'grader job error code is invalid';
  END IF;

  SELECT * INTO processing
    FROM learning_validation.grader_job_processing
   WHERE job_id = p_job_id
     AND status = 'processing'
     AND lease_token = p_lease_token
     AND lease_expires_at > now()
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF processing.attempt_count >= 5 THEN
    terminal_result := jsonb_build_object(
      'protocolVersion', 1,
      'jobId', p_job_id,
      'status', 'system_error',
      'error', jsonb_build_object(
        'code', p_error_code,
        'retryable', true
      )
    );
    result_id := learning_validation.persist_grader_validation_result(
      p_job_id,
      terminal_result,
      'dead_letter'
    );

    UPDATE learning_validation.grader_job_processing
       SET status = 'dead_letter',
           available_at = now(),
           validation_result_id = result_id,
           lease_token = NULL,
           lease_expires_at = NULL,
           last_error_code = p_error_code,
           last_error_at = now(),
           finished_at = now(),
           updated_at = now()
     WHERE job_id = p_job_id;

    RETURN 'dead_letter';
  END IF;

  UPDATE learning_validation.grader_job_processing
     SET status = 'retryable',
         available_at = GREATEST(p_retry_at, now()),
         validation_result_id = NULL,
         lease_token = NULL,
         lease_expires_at = NULL,
         last_error_code = p_error_code,
         last_error_at = now(),
         finished_at = NULL,
         updated_at = now()
   WHERE job_id = p_job_id;

  RETURN 'retryable';
END
$$;

REVOKE ALL ON FUNCTION platform_internal.fail_grader_job(text, uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform_internal.fail_grader_job(text, uuid, text, timestamptz) TO platform_worker;

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
DECLARE
  exhausted record;
  result_id uuid;
  terminal_result jsonb;
BEGIN
  IF p_lease_seconds < 1 OR p_lease_seconds > 900 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'grader job lease seconds must be between 1 and 900';
  END IF;

  FOR exhausted IN
    SELECT processing.job_id
      FROM learning_validation.grader_job_processing AS processing
     WHERE processing.status = 'processing'
       AND processing.lease_expires_at <= now()
       AND processing.attempt_count >= 5
     ORDER BY processing.lease_expires_at, processing.job_id
     LIMIT 100
     FOR UPDATE SKIP LOCKED
  LOOP
    terminal_result := jsonb_build_object(
      'protocolVersion', 1,
      'jobId', exhausted.job_id,
      'status', 'system_error',
      'error', jsonb_build_object(
        'code', 'lease_expired_attempts_exhausted',
        'retryable', true
      )
    );
    result_id := learning_validation.persist_grader_validation_result(
      exhausted.job_id,
      terminal_result,
      'dead_letter'
    );

    UPDATE learning_validation.grader_job_processing
       SET status = 'dead_letter',
           validation_result_id = result_id,
           lease_token = NULL,
           lease_expires_at = NULL,
           last_error_code = 'lease_expired_attempts_exhausted',
           last_error_at = now(),
           finished_at = now(),
           updated_at = now()
     WHERE job_id = exhausted.job_id;
  END LOOP;

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
           validation_result_id = NULL,
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

DO $$
DECLARE
  exhausted record;
  result_id uuid;
  terminal_result jsonb;
BEGIN
  IF EXISTS (
    SELECT 1
      FROM learning_validation.grader_job_processing
     WHERE status IN ('completed', 'system_error')
  ) THEN
    RAISE EXCEPTION 'pre-existing completed/system_error grader jobs cannot be migrated without terminal provenance';
  END IF;

  FOR exhausted IN
    SELECT job_id, COALESCE(last_error_code, 'legacy_dead_letter') AS error_code
      FROM learning_validation.grader_job_processing
     WHERE status = 'dead_letter'
     FOR UPDATE
  LOOP
    terminal_result := jsonb_build_object(
      'protocolVersion', 1,
      'jobId', exhausted.job_id,
      'status', 'system_error',
      'error', jsonb_build_object(
        'code', exhausted.error_code,
        'retryable', true
      )
    );
    result_id := learning_validation.persist_grader_validation_result(
      exhausted.job_id,
      terminal_result,
      'dead_letter'
    );
    UPDATE learning_validation.grader_job_processing
       SET validation_result_id = result_id
     WHERE job_id = exhausted.job_id;
  END LOOP;
END
$$;

ALTER TABLE learning_validation.grader_job_processing
  ADD CONSTRAINT grader_job_processing_terminal_result_check
    CHECK (
      (
        status IN ('completed', 'system_error', 'dead_letter')
        AND validation_result_id IS NOT NULL
      )
      OR
      (
        status NOT IN ('completed', 'system_error', 'dead_letter')
        AND validation_result_id IS NULL
      )
    );
