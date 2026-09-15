-- F4: canonical append-only learner LearningEvent history.
-- The journal is distinct from the transactional integration outbox.

CREATE SCHEMA learning_history;

REVOKE ALL ON SCHEMA learning_history FROM PUBLIC;
GRANT USAGE ON SCHEMA learning_history TO platform_app;

ALTER TABLE learning_progress.evidence
  ADD CONSTRAINT evidence_organization_id_id_key UNIQUE (organization_id, id);

CREATE TABLE learning_history.learning_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  learner_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  enrollment_id uuid NOT NULL,
  event_name text NOT NULL
    CHECK (event_name IN (
      'attempt.started',
      'submission.submitted',
      'validation.result_recorded',
      'evidence.recorded'
    )),
  event_version integer NOT NULL DEFAULT 1 CHECK (event_version = 1),
  attempt_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  submission_id uuid,
  validation_result_id uuid,
  evidence_id uuid,
  skill_id uuid,
  outcome text CHECK (outcome IN ('passed', 'failed', 'needs_review')),
  score numeric(6,5) CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  evidence_kind text CHECK (
    evidence_kind IS NULL
    OR (
      char_length(evidence_kind) BETWEEN 2 AND 80
      AND evidence_kind ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
    )
  ),
  evidence_source_type text
    CHECK (evidence_source_type IS NULL OR evidence_source_type IN ('manual', 'validation_result')),
  occurred_at timestamptz NOT NULL,
  event_order smallint GENERATED ALWAYS AS (
    CASE event_name
      WHEN 'attempt.started' THEN 10
      WHEN 'submission.submitted' THEN 20
      WHEN 'validation.result_recorded' THEN 30
      WHEN 'evidence.recorded' THEN 40
    END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, enrollment_id)
    REFERENCES learning_delivery.enrollments(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, attempt_id)
    REFERENCES learning_progress.attempts(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES learning_progress.submissions(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, validation_result_id)
    REFERENCES learning_validation.validation_results(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, evidence_id)
    REFERENCES learning_progress.evidence(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, skill_id)
    REFERENCES learning_content.skills(organization_id, id)
    ON DELETE RESTRICT,
  CHECK (
    (
      event_name = 'attempt.started'
      AND submission_id IS NULL
      AND validation_result_id IS NULL
      AND evidence_id IS NULL
      AND skill_id IS NULL
      AND outcome IS NULL
      AND score IS NULL
      AND evidence_kind IS NULL
      AND evidence_source_type IS NULL
    )
    OR
    (
      event_name = 'submission.submitted'
      AND submission_id IS NOT NULL
      AND validation_result_id IS NULL
      AND evidence_id IS NULL
      AND skill_id IS NULL
      AND outcome IS NULL
      AND score IS NULL
      AND evidence_kind IS NULL
      AND evidence_source_type IS NULL
    )
    OR
    (
      event_name = 'validation.result_recorded'
      AND submission_id IS NOT NULL
      AND validation_result_id IS NOT NULL
      AND evidence_id IS NULL
      AND skill_id IS NULL
      AND outcome IS NOT NULL
      AND evidence_kind IS NULL
      AND evidence_source_type IS NULL
    )
    OR
    (
      event_name = 'evidence.recorded'
      AND submission_id IS NOT NULL
      AND evidence_id IS NOT NULL
      AND skill_id IS NOT NULL
      AND outcome IS NULL
      AND evidence_kind IS NOT NULL
      AND evidence_source_type IS NOT NULL
      AND (
        (evidence_source_type = 'manual' AND validation_result_id IS NULL)
        OR
        (evidence_source_type = 'validation_result' AND validation_result_id IS NOT NULL)
      )
    )
  )
);

CREATE UNIQUE INDEX learning_events_attempt_started_uq
  ON learning_history.learning_events (organization_id, attempt_id)
  WHERE event_name = 'attempt.started';

CREATE UNIQUE INDEX learning_events_submission_submitted_uq
  ON learning_history.learning_events (organization_id, submission_id)
  WHERE event_name = 'submission.submitted';

CREATE UNIQUE INDEX learning_events_validation_result_recorded_uq
  ON learning_history.learning_events (organization_id, validation_result_id)
  WHERE event_name = 'validation.result_recorded';

CREATE UNIQUE INDEX learning_events_evidence_recorded_uq
  ON learning_history.learning_events (organization_id, evidence_id)
  WHERE event_name = 'evidence.recorded';

CREATE INDEX learning_events_enrollment_history_idx
  ON learning_history.learning_events
    (organization_id, enrollment_id, occurred_at DESC, event_order DESC, id DESC);

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
      RAISE EXCEPTION USING
        ERRCODE = '23514',
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
      RAISE EXCEPTION USING
        ERRCODE = '23514',
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
      RAISE EXCEPTION USING
        ERRCODE = '23514',
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
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Evidence LearningEvent must match its canonical Evidence';
    END IF;
  END IF;

  -- Application DTOs pass PostgreSQL timestamps through JavaScript Date, which
  -- rounds to millisecond precision. The immutable source row is canonical, so
  -- retain its full timestamptz precision in the learner journal.
  NEW.occurred_at := canonical_occurred_at;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_history.validate_learning_event_source() FROM PUBLIC;

CREATE TRIGGER learning_events_validate_source
BEFORE INSERT ON learning_history.learning_events
FOR EACH ROW EXECUTE FUNCTION learning_history.validate_learning_event_source();

INSERT INTO learning_history.learning_events
  (organization_id, learner_user_id, enrollment_id, event_name, attempt_id,
   activity_version_id, attempt_number, occurred_at)
SELECT attempt.organization_id,
       enrollment.user_id,
       attempt.enrollment_id,
       'attempt.started',
       attempt.id,
       attempt.activity_version_id,
       attempt.attempt_number,
       attempt.created_at
  FROM learning_progress.attempts AS attempt
  JOIN learning_delivery.enrollments AS enrollment
    ON enrollment.organization_id = attempt.organization_id
   AND enrollment.id = attempt.enrollment_id;

INSERT INTO learning_history.learning_events
  (organization_id, learner_user_id, enrollment_id, event_name, attempt_id,
   activity_version_id, attempt_number, submission_id, occurred_at)
SELECT submission.organization_id,
       enrollment.user_id,
       attempt.enrollment_id,
       'submission.submitted',
       attempt.id,
       attempt.activity_version_id,
       attempt.attempt_number,
       submission.id,
       submission.submitted_at
  FROM learning_progress.submissions AS submission
  JOIN learning_progress.attempts AS attempt
    ON attempt.organization_id = submission.organization_id
   AND attempt.id = submission.attempt_id
  JOIN learning_delivery.enrollments AS enrollment
    ON enrollment.organization_id = attempt.organization_id
   AND enrollment.id = attempt.enrollment_id;

INSERT INTO learning_history.learning_events
  (organization_id, learner_user_id, enrollment_id, event_name, attempt_id,
   activity_version_id, attempt_number, submission_id, validation_result_id,
   outcome, score, occurred_at)
SELECT result.organization_id,
       enrollment.user_id,
       attempt.enrollment_id,
       'validation.result_recorded',
       attempt.id,
       result.activity_version_id,
       attempt.attempt_number,
       result.submission_id,
       result.id,
       result.outcome,
       result.score,
       result.recorded_at
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
 WHERE result.status = 'completed';

INSERT INTO learning_history.learning_events
  (organization_id, learner_user_id, enrollment_id, event_name, attempt_id,
   activity_version_id, attempt_number, submission_id, validation_result_id,
   evidence_id, skill_id, score, evidence_kind, evidence_source_type, occurred_at)
SELECT evidence.organization_id,
       enrollment.user_id,
       attempt.enrollment_id,
       'evidence.recorded',
       attempt.id,
       attempt.activity_version_id,
       attempt.attempt_number,
       evidence.submission_id,
       evidence.source_validation_result_id,
       evidence.id,
       evidence.skill_id,
       evidence.score,
       evidence.kind,
       evidence.source_type,
       evidence.created_at
  FROM learning_progress.evidence AS evidence
  JOIN learning_progress.attempts AS attempt
    ON attempt.organization_id = evidence.organization_id
   AND attempt.id = evidence.attempt_id
  JOIN learning_delivery.enrollments AS enrollment
    ON enrollment.organization_id = attempt.organization_id
   AND enrollment.id = attempt.enrollment_id;

GRANT SELECT, INSERT ON learning_history.learning_events TO platform_app;

ALTER TABLE learning_history.learning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_events_app_tenant_select_policy
  ON learning_history.learning_events
  FOR SELECT
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id());

CREATE POLICY learning_events_app_tenant_insert_policy
  ON learning_history.learning_events
  FOR INSERT
  TO platform_app
  WITH CHECK (organization_id = platform_internal.current_organization_id());
