-- F5: protected immutable Guided Build content, Attempt-scoped GuidanceExposure,
-- and normalized guidance LearningEvents.

CREATE SCHEMA learning_guidance;
REVOKE ALL ON SCHEMA learning_guidance FROM PUBLIC;
GRANT USAGE ON SCHEMA learning_guidance TO platform_app;

CREATE TABLE learning_content.guided_build_definitions (
  organization_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  professional_solution_key text NOT NULL
    CHECK (char_length(professional_solution_key) BETWEEN 2 AND 63
      AND professional_solution_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  professional_solution_title text NOT NULL
    CHECK (char_length(btrim(professional_solution_title)) BETWEEN 1 AND 200),
  professional_solution_content jsonb NOT NULL
    CHECK (jsonb_typeof(professional_solution_content) = 'object'),
  transfer_activity_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_version_id),
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, transfer_activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, activity_version_id),
  UNIQUE (organization_id, activity_version_id, professional_solution_key),
  CHECK (transfer_activity_version_id IS NULL OR transfer_activity_version_id <> activity_version_id)
);

CREATE TABLE learning_content.guided_build_steps (
  organization_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  step_key text NOT NULL
    CHECK (char_length(step_key) BETWEEN 2 AND 63
      AND step_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  position integer NOT NULL CHECK (position >= 0),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  instructions text CHECK (instructions IS NULL OR char_length(instructions) <= 20000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_version_id, step_key),
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.guided_build_definitions(organization_id, activity_version_id)
    ON DELETE CASCADE,
  UNIQUE (organization_id, activity_version_id, step_key),
  UNIQUE (organization_id, activity_version_id, position)
);

CREATE TABLE learning_content.guided_build_hints (
  organization_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  step_key text NOT NULL,
  hint_key text NOT NULL
    CHECK (char_length(hint_key) BETWEEN 2 AND 63
      AND hint_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  position integer NOT NULL CHECK (position >= 0),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_version_id, hint_key),
  FOREIGN KEY (organization_id, activity_version_id, step_key)
    REFERENCES learning_content.guided_build_steps(organization_id, activity_version_id, step_key)
    ON DELETE CASCADE,
  UNIQUE (organization_id, activity_version_id, step_key, hint_key),
  UNIQUE (organization_id, activity_version_id, step_key, position)
);

CREATE OR REPLACE FUNCTION learning_content.validate_guided_build_definition_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  source_version_id uuid;
  source_status text;
  transfer_version_id uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT activity.course_version_id, version.status
      INTO source_version_id, source_status
      FROM learning_content.course_version_activities AS activity
      JOIN learning_content.course_versions AS version
        ON version.organization_id = activity.organization_id
       AND version.id = activity.course_version_id
     WHERE activity.organization_id = OLD.organization_id
       AND activity.id = OLD.activity_version_id;
    IF source_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'published Guided Build content is immutable';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT activity.course_version_id, version.status
      INTO source_version_id, source_status
      FROM learning_content.course_version_activities AS activity
      JOIN learning_content.course_versions AS version
        ON version.organization_id = activity.organization_id
       AND version.id = activity.course_version_id
     WHERE activity.organization_id = NEW.organization_id
       AND activity.id = NEW.activity_version_id;
    IF source_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION USING ERRCODE = '55000',
        MESSAGE = 'Guided Build content requires a draft CourseVersion';
    END IF;

    IF NEW.transfer_activity_version_id IS NOT NULL THEN
      SELECT activity.course_version_id
        INTO transfer_version_id
        FROM learning_content.course_version_activities AS activity
       WHERE activity.organization_id = NEW.organization_id
         AND activity.id = NEW.transfer_activity_version_id;
      IF transfer_version_id IS DISTINCT FROM source_version_id THEN
        RAISE EXCEPTION USING ERRCODE = '23514',
          MESSAGE = 'Guided Build transfer must belong to the same CourseVersion';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_content.validate_guided_build_definition_context() FROM PUBLIC;

CREATE OR REPLACE FUNCTION learning_content.require_draft_guided_build_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  target_organization_id uuid;
  target_activity_version_id uuid;
  persisted_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_organization_id := OLD.organization_id;
    target_activity_version_id := OLD.activity_version_id;
  ELSE
    target_organization_id := NEW.organization_id;
    target_activity_version_id := NEW.activity_version_id;
  END IF;

  SELECT version.status
    INTO persisted_status
    FROM learning_content.course_version_activities AS activity
    JOIN learning_content.course_versions AS version
      ON version.organization_id = activity.organization_id
     AND version.id = activity.course_version_id
   WHERE activity.organization_id = target_organization_id
     AND activity.id = target_activity_version_id;

  IF persisted_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = '55000',
      MESSAGE = 'published Guided Build content is immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_content.require_draft_guided_build_child() FROM PUBLIC;

CREATE TRIGGER guided_build_definitions_validate_context
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.guided_build_definitions
FOR EACH ROW EXECUTE FUNCTION learning_content.validate_guided_build_definition_context();
CREATE TRIGGER guided_build_steps_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.guided_build_steps
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_guided_build_child();
CREATE TRIGGER guided_build_hints_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.guided_build_hints
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_guided_build_child();

CREATE TABLE learning_guidance.guidance_exposures (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  organization_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('hint', 'professional_solution')),
  step_key text,
  hint_key text,
  solution_key text,
  idempotency_key text NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 1 AND 200),
  revealed_by_user_id uuid NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
  revealed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, enrollment_id)
    REFERENCES learning_delivery.enrollments(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, attempt_id)
    REFERENCES learning_progress.attempts(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, activity_version_id, step_key, hint_key)
    REFERENCES learning_content.guided_build_hints(organization_id, activity_version_id, step_key, hint_key)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, activity_version_id, solution_key)
    REFERENCES learning_content.guided_build_definitions(organization_id, activity_version_id, professional_solution_key)
    ON DELETE RESTRICT,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, attempt_id, idempotency_key),
  CHECK (
    (kind = 'hint' AND step_key IS NOT NULL AND hint_key IS NOT NULL AND solution_key IS NULL)
    OR
    (kind = 'professional_solution' AND step_key IS NULL AND hint_key IS NULL AND solution_key IS NOT NULL)
  )
);

CREATE UNIQUE INDEX guidance_exposures_hint_once_uq
  ON learning_guidance.guidance_exposures (organization_id, attempt_id, hint_key)
  WHERE kind = 'hint';
CREATE UNIQUE INDEX guidance_exposures_solution_once_uq
  ON learning_guidance.guidance_exposures (organization_id, attempt_id)
  WHERE kind = 'professional_solution';
CREATE INDEX guidance_exposures_attempt_history_idx
  ON learning_guidance.guidance_exposures
    (organization_id, attempt_id, revealed_at, id);

CREATE OR REPLACE FUNCTION learning_guidance.validate_guidance_exposure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  canonical_enrollment_id uuid;
  canonical_activity_version_id uuid;
  learner_user_id uuid;
  principal_user_id uuid;
  hint_position integer;
BEGIN
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

CREATE OR REPLACE FUNCTION learning_guidance.reject_guidance_exposure_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'GuidanceExposure is append-only';
END
$$;
REVOKE ALL ON FUNCTION learning_guidance.reject_guidance_exposure_mutation() FROM PUBLIC;

CREATE TRIGGER guidance_exposures_validate
BEFORE INSERT ON learning_guidance.guidance_exposures
FOR EACH ROW EXECUTE FUNCTION learning_guidance.validate_guidance_exposure();
CREATE TRIGGER guidance_exposures_append_only
BEFORE UPDATE OR DELETE ON learning_guidance.guidance_exposures
FOR EACH ROW EXECUTE FUNCTION learning_guidance.reject_guidance_exposure_mutation();

GRANT SELECT, INSERT ON learning_content.guided_build_definitions TO platform_app;
GRANT SELECT, INSERT ON learning_content.guided_build_steps TO platform_app;
GRANT SELECT, INSERT ON learning_content.guided_build_hints TO platform_app;
GRANT SELECT, INSERT ON learning_guidance.guidance_exposures TO platform_app;

ALTER TABLE learning_content.guided_build_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.guided_build_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.guided_build_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_guidance.guidance_exposures ENABLE ROW LEVEL SECURITY;

CREATE POLICY guided_build_definitions_app_tenant_policy
  ON learning_content.guided_build_definitions FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
CREATE POLICY guided_build_steps_app_tenant_policy
  ON learning_content.guided_build_steps FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
CREATE POLICY guided_build_hints_app_tenant_policy
  ON learning_content.guided_build_hints FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
CREATE POLICY guidance_exposures_app_tenant_select_policy
  ON learning_guidance.guidance_exposures FOR SELECT TO platform_app
  USING (organization_id = platform_internal.current_organization_id());
CREATE POLICY guidance_exposures_app_tenant_insert_policy
  ON learning_guidance.guidance_exposures FOR INSERT TO platform_app
  WITH CHECK (organization_id = platform_internal.current_organization_id());

ALTER TABLE learning_history.learning_events
  ADD COLUMN guidance_exposure_id uuid,
  ADD COLUMN guidance_step_key text,
  ADD COLUMN guidance_hint_key text,
  ADD COLUMN guidance_solution_key text;

ALTER TABLE learning_history.learning_events
  DROP CONSTRAINT learning_events_event_name_check,
  ADD CONSTRAINT learning_events_event_name_check CHECK (event_name IN (
    'attempt.started',
    'guidance.hint_revealed',
    'submission.submitted',
    'guidance.solution_revealed',
    'validation.result_recorded',
    'evidence.recorded'
  )),
  DROP CONSTRAINT learning_events_check,
  ADD CONSTRAINT learning_events_shape_check CHECK (
    (event_name = 'attempt.started'
      AND submission_id IS NULL AND validation_result_id IS NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NULL AND score IS NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NULL
      AND guidance_step_key IS NULL AND guidance_hint_key IS NULL AND guidance_solution_key IS NULL)
    OR
    (event_name = 'guidance.hint_revealed'
      AND submission_id IS NULL AND validation_result_id IS NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NULL AND score IS NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NOT NULL
      AND guidance_step_key IS NOT NULL AND guidance_hint_key IS NOT NULL AND guidance_solution_key IS NULL)
    OR
    (event_name = 'submission.submitted'
      AND submission_id IS NOT NULL AND validation_result_id IS NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NULL AND score IS NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NULL
      AND guidance_step_key IS NULL AND guidance_hint_key IS NULL AND guidance_solution_key IS NULL)
    OR
    (event_name = 'guidance.solution_revealed'
      AND submission_id IS NULL AND validation_result_id IS NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NULL AND score IS NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NOT NULL
      AND guidance_step_key IS NULL AND guidance_hint_key IS NULL AND guidance_solution_key IS NOT NULL)
    OR
    (event_name = 'validation.result_recorded'
      AND submission_id IS NOT NULL AND validation_result_id IS NOT NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NOT NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NULL
      AND guidance_step_key IS NULL AND guidance_hint_key IS NULL AND guidance_solution_key IS NULL)
    OR
    (event_name = 'evidence.recorded'
      AND submission_id IS NOT NULL AND evidence_id IS NOT NULL AND skill_id IS NOT NULL
      AND outcome IS NULL AND evidence_kind IS NOT NULL AND evidence_source_type IS NOT NULL
      AND guidance_exposure_id IS NULL AND guidance_step_key IS NULL
      AND guidance_hint_key IS NULL AND guidance_solution_key IS NULL
      AND ((evidence_source_type = 'manual' AND validation_result_id IS NULL)
        OR (evidence_source_type = 'validation_result' AND validation_result_id IS NOT NULL)))
  ),
  ADD CONSTRAINT learning_events_guidance_exposure_fk
    FOREIGN KEY (organization_id, guidance_exposure_id)
    REFERENCES learning_guidance.guidance_exposures(organization_id, id)
    ON DELETE RESTRICT;

DROP INDEX learning_history.learning_events_enrollment_history_idx;
ALTER TABLE learning_history.learning_events DROP COLUMN event_order;
ALTER TABLE learning_history.learning_events ADD COLUMN event_order smallint GENERATED ALWAYS AS (
  CASE event_name
    WHEN 'attempt.started' THEN 10
    WHEN 'guidance.hint_revealed' THEN 15
    WHEN 'submission.submitted' THEN 20
    WHEN 'guidance.solution_revealed' THEN 25
    WHEN 'validation.result_recorded' THEN 30
    WHEN 'evidence.recorded' THEN 40
  END
) STORED;
CREATE INDEX learning_events_enrollment_history_idx
  ON learning_history.learning_events
    (organization_id, enrollment_id, occurred_at DESC, event_order DESC, id DESC);
CREATE UNIQUE INDEX learning_events_guidance_exposure_uq
  ON learning_history.learning_events (organization_id, guidance_exposure_id)
  WHERE guidance_exposure_id IS NOT NULL;

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
    SELECT attempt.created_at INTO canonical_occurred_at
      FROM learning_progress.attempts AS attempt
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id AND enrollment.id = attempt.enrollment_id
     WHERE attempt.organization_id = NEW.organization_id AND attempt.id = NEW.attempt_id
       AND attempt.enrollment_id = NEW.enrollment_id AND attempt.activity_version_id = NEW.activity_version_id
       AND attempt.attempt_number = NEW.attempt_number AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'attempt LearningEvent must match its canonical Attempt'; END IF;
  ELSIF NEW.event_name = 'guidance.hint_revealed' THEN
    SELECT exposure.revealed_at INTO canonical_occurred_at
      FROM learning_guidance.guidance_exposures AS exposure
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = exposure.organization_id AND attempt.id = exposure.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id AND enrollment.id = attempt.enrollment_id
     WHERE exposure.organization_id = NEW.organization_id AND exposure.id = NEW.guidance_exposure_id
       AND exposure.kind = 'hint' AND exposure.attempt_id = NEW.attempt_id
       AND exposure.enrollment_id = NEW.enrollment_id AND exposure.activity_version_id = NEW.activity_version_id
       AND exposure.step_key = NEW.guidance_step_key AND exposure.hint_key = NEW.guidance_hint_key
       AND attempt.attempt_number = NEW.attempt_number AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'hint LearningEvent must match its canonical GuidanceExposure'; END IF;
  ELSIF NEW.event_name = 'submission.submitted' THEN
    SELECT submission.submitted_at INTO canonical_occurred_at
      FROM learning_progress.submissions AS submission
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = submission.organization_id AND attempt.id = submission.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id AND enrollment.id = attempt.enrollment_id
     WHERE submission.organization_id = NEW.organization_id AND submission.id = NEW.submission_id
       AND submission.attempt_id = NEW.attempt_id AND attempt.enrollment_id = NEW.enrollment_id
       AND attempt.activity_version_id = NEW.activity_version_id AND attempt.attempt_number = NEW.attempt_number
       AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'submission LearningEvent must match its canonical Submission'; END IF;
  ELSIF NEW.event_name = 'guidance.solution_revealed' THEN
    SELECT exposure.revealed_at INTO canonical_occurred_at
      FROM learning_guidance.guidance_exposures AS exposure
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = exposure.organization_id AND attempt.id = exposure.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id AND enrollment.id = attempt.enrollment_id
     WHERE exposure.organization_id = NEW.organization_id AND exposure.id = NEW.guidance_exposure_id
       AND exposure.kind = 'professional_solution' AND exposure.attempt_id = NEW.attempt_id
       AND exposure.enrollment_id = NEW.enrollment_id AND exposure.activity_version_id = NEW.activity_version_id
       AND exposure.solution_key = NEW.guidance_solution_key
       AND attempt.attempt_number = NEW.attempt_number AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'solution LearningEvent must match its canonical GuidanceExposure'; END IF;
  ELSIF NEW.event_name = 'validation.result_recorded' THEN
    SELECT result.recorded_at INTO canonical_occurred_at
      FROM learning_validation.validation_results AS result
      JOIN learning_progress.submissions AS submission
        ON submission.organization_id = result.organization_id AND submission.id = result.submission_id
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = submission.organization_id AND attempt.id = submission.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id AND enrollment.id = attempt.enrollment_id
     WHERE result.organization_id = NEW.organization_id AND result.id = NEW.validation_result_id
       AND result.status = 'completed' AND result.submission_id = NEW.submission_id
       AND result.activity_version_id = NEW.activity_version_id AND result.outcome = NEW.outcome
       AND result.score IS NOT DISTINCT FROM NEW.score AND attempt.id = NEW.attempt_id
       AND attempt.enrollment_id = NEW.enrollment_id AND attempt.attempt_number = NEW.attempt_number
       AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'validation LearningEvent must match its completed ValidationResult'; END IF;
  ELSIF NEW.event_name = 'evidence.recorded' THEN
    SELECT evidence.created_at INTO canonical_occurred_at
      FROM learning_progress.evidence AS evidence
      JOIN learning_progress.attempts AS attempt
        ON attempt.organization_id = evidence.organization_id AND attempt.id = evidence.attempt_id
      JOIN learning_delivery.enrollments AS enrollment
        ON enrollment.organization_id = attempt.organization_id AND enrollment.id = attempt.enrollment_id
     WHERE evidence.organization_id = NEW.organization_id AND evidence.id = NEW.evidence_id
       AND evidence.attempt_id = NEW.attempt_id AND evidence.submission_id = NEW.submission_id
       AND evidence.skill_id = NEW.skill_id AND evidence.kind = NEW.evidence_kind
       AND evidence.score IS NOT DISTINCT FROM NEW.score AND evidence.source_type = NEW.evidence_source_type
       AND evidence.source_validation_result_id IS NOT DISTINCT FROM NEW.validation_result_id
       AND attempt.enrollment_id = NEW.enrollment_id AND attempt.activity_version_id = NEW.activity_version_id
       AND attempt.attempt_number = NEW.attempt_number AND enrollment.user_id = NEW.learner_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Evidence LearningEvent must match its canonical Evidence'; END IF;
  END IF;

  NEW.occurred_at := canonical_occurred_at;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_history.validate_learning_event_source() FROM PUBLIC;
