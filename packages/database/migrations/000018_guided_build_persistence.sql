-- F5: protected immutable Guided Build content, append-only Attempt-scoped
-- guidance exposure facts, and normalized learner history.

CREATE SCHEMA learning_guidance;
REVOKE ALL ON SCHEMA learning_guidance FROM PUBLIC;
GRANT USAGE ON SCHEMA learning_guidance TO platform_app;

CREATE TABLE learning_content.guided_build_definitions (
  organization_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  transfer_activity_version_id uuid,
  solution_key text NOT NULL
    CHECK (char_length(solution_key) BETWEEN 2 AND 63
      AND solution_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  solution_title text NOT NULL CHECK (char_length(btrim(solution_title)) BETWEEN 1 AND 200),
  solution_content text NOT NULL CHECK (char_length(btrim(solution_content)) BETWEEN 1 AND 100000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_version_id),
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, transfer_activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id)
    ON DELETE RESTRICT,
  CHECK (transfer_activity_version_id IS NULL OR transfer_activity_version_id <> activity_version_id),
  UNIQUE (organization_id, activity_version_id)
);

CREATE TABLE learning_content.guided_build_steps (
  organization_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  step_key text NOT NULL
    CHECK (char_length(step_key) BETWEEN 2 AND 63
      AND step_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  instructions text CHECK (instructions IS NULL OR char_length(instructions) <= 20000),
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_version_id, step_key),
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.guided_build_definitions(organization_id, activity_version_id)
    ON DELETE CASCADE,
  UNIQUE (activity_version_id, position),
  UNIQUE (organization_id, activity_version_id, step_key)
);

CREATE TABLE learning_content.guided_build_hints (
  organization_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  step_key text NOT NULL,
  hint_key text NOT NULL
    CHECK (char_length(hint_key) BETWEEN 2 AND 63
      AND hint_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 20000),
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_version_id, hint_key),
  FOREIGN KEY (organization_id, activity_version_id, step_key)
    REFERENCES learning_content.guided_build_steps(organization_id, activity_version_id, step_key)
    ON DELETE CASCADE,
  UNIQUE (activity_version_id, step_key, position),
  UNIQUE (organization_id, activity_version_id, step_key, hint_key)
);

CREATE OR REPLACE FUNCTION learning_content.require_draft_guided_build_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  candidate_activity_version_id uuid;
  version_status text;
BEGIN
  candidate_activity_version_id := CASE WHEN TG_OP = 'DELETE'
    THEN OLD.activity_version_id ELSE NEW.activity_version_id END;

  SELECT version.status
    INTO version_status
    FROM learning_content.course_version_activities AS activity
    JOIN learning_content.course_versions AS version
      ON version.organization_id = activity.organization_id
     AND version.id = activity.course_version_id
   WHERE activity.id = candidate_activity_version_id;

  IF version_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'published Guided Build content is immutable';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_content.require_draft_guided_build_content() FROM PUBLIC;

CREATE TRIGGER guided_build_definitions_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.guided_build_definitions
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_guided_build_content();
CREATE TRIGGER guided_build_steps_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.guided_build_steps
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_guided_build_content();
CREATE TRIGGER guided_build_hints_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON learning_content.guided_build_hints
FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_guided_build_content();

CREATE OR REPLACE FUNCTION learning_content.validate_guided_build_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  source_version_id uuid;
  transfer_version_id uuid;
BEGIN
  IF NEW.transfer_activity_version_id IS NULL THEN RETURN NEW; END IF;

  SELECT course_version_id INTO source_version_id
    FROM learning_content.course_version_activities
   WHERE organization_id = NEW.organization_id AND id = NEW.activity_version_id;
  SELECT course_version_id INTO transfer_version_id
    FROM learning_content.course_version_activities
   WHERE organization_id = NEW.organization_id AND id = NEW.transfer_activity_version_id;

  IF source_version_id IS NULL OR transfer_version_id IS DISTINCT FROM source_version_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Guided Build transfer activity must belong to the same CourseVersion';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_content.validate_guided_build_transfer() FROM PUBLIC;
CREATE TRIGGER guided_build_definitions_validate_transfer
BEFORE INSERT OR UPDATE ON learning_content.guided_build_definitions
FOR EACH ROW EXECUTE FUNCTION learning_content.validate_guided_build_transfer();

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
  revealed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, enrollment_id)
    REFERENCES learning_delivery.enrollments(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, attempt_id)
    REFERENCES learning_progress.attempts(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities(organization_id, id) ON DELETE RESTRICT,
  CHECK (
    (kind = 'hint' AND step_key IS NOT NULL AND hint_key IS NOT NULL AND solution_key IS NULL)
    OR
    (kind = 'professional_solution' AND step_key IS NULL AND hint_key IS NULL AND solution_key IS NOT NULL)
  ),
  UNIQUE (organization_id, attempt_id, idempotency_key),
  UNIQUE (organization_id, id)
);

CREATE UNIQUE INDEX guidance_exposures_hint_uq
  ON learning_guidance.guidance_exposures (organization_id, attempt_id, hint_key)
  WHERE kind = 'hint';
CREATE UNIQUE INDEX guidance_exposures_solution_uq
  ON learning_guidance.guidance_exposures (organization_id, attempt_id)
  WHERE kind = 'professional_solution';
CREATE INDEX guidance_exposures_attempt_idx
  ON learning_guidance.guidance_exposures (organization_id, attempt_id, revealed_at, id);

CREATE OR REPLACE FUNCTION learning_guidance.validate_guidance_exposure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  canonical_enrollment_id uuid;
  canonical_activity_version_id uuid;
  definition_solution_key text;
  definition_has_hint boolean;
  submission_exists boolean;
BEGIN
  SELECT attempt.enrollment_id, attempt.activity_version_id,
         EXISTS (
           SELECT 1 FROM learning_progress.submissions AS submission
            WHERE submission.organization_id = attempt.organization_id
              AND submission.attempt_id = attempt.id
         )
    INTO canonical_enrollment_id, canonical_activity_version_id, submission_exists
    FROM learning_progress.attempts AS attempt
   WHERE attempt.organization_id = NEW.organization_id
     AND attempt.id = NEW.attempt_id;

  IF canonical_enrollment_id IS NULL
     OR canonical_enrollment_id IS DISTINCT FROM NEW.enrollment_id
     OR canonical_activity_version_id IS DISTINCT FROM NEW.activity_version_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Guidance exposure must match its canonical Attempt';
  END IF;

  IF NEW.kind = 'hint' THEN
    IF submission_exists THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Guided Build hints cannot be revealed after Submission';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM learning_content.guided_build_hints AS hint
       WHERE hint.organization_id = NEW.organization_id
         AND hint.activity_version_id = NEW.activity_version_id
         AND hint.step_key = NEW.step_key
         AND hint.hint_key = NEW.hint_key
    ) INTO definition_has_hint;
    IF NOT definition_has_hint THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Guidance hint exposure must reference canonical Guided Build content';
    END IF;
  ELSE
    IF NOT submission_exists THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Professional solution exposure requires a Submission';
    END IF;
    SELECT solution_key INTO definition_solution_key
      FROM learning_content.guided_build_definitions
     WHERE organization_id = NEW.organization_id
       AND activity_version_id = NEW.activity_version_id;
    IF definition_solution_key IS DISTINCT FROM NEW.solution_key THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'Solution exposure must reference canonical Guided Build content';
    END IF;
  END IF;

  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_guidance.validate_guidance_exposure() FROM PUBLIC;
CREATE TRIGGER guidance_exposures_validate_source
BEFORE INSERT ON learning_guidance.guidance_exposures
FOR EACH ROW EXECUTE FUNCTION learning_guidance.validate_guidance_exposure();

ALTER TABLE learning_history.learning_events
  ADD COLUMN guidance_exposure_id uuid,
  ADD COLUMN guidance_step_key text,
  ADD COLUMN guidance_hint_key text,
  ADD COLUMN guidance_solution_key text;

ALTER TABLE learning_history.learning_events
  DROP CONSTRAINT learning_events_event_name_check;
ALTER TABLE learning_history.learning_events
  ADD CONSTRAINT learning_events_event_name_check CHECK (event_name IN (
    'attempt.started', 'submission.submitted', 'validation.result_recorded', 'evidence.recorded',
    'guidance.hint_revealed', 'guidance.solution_revealed'
  ));

ALTER TABLE learning_history.learning_events
  ADD CONSTRAINT learning_events_guidance_exposure_fk
    FOREIGN KEY (organization_id, guidance_exposure_id)
    REFERENCES learning_guidance.guidance_exposures(organization_id, id)
    ON DELETE CASCADE;

-- Existing event-specific CHECK from 000017 is replaced so guidance events remain
-- normalized and cannot carry protected content or unrelated lifecycle columns.
ALTER TABLE learning_history.learning_events
  DROP CONSTRAINT learning_events_check;
ALTER TABLE learning_history.learning_events
  ADD CONSTRAINT learning_events_shape_check CHECK (
    (event_name = 'attempt.started'
      AND submission_id IS NULL AND validation_result_id IS NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NULL AND score IS NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NULL)
    OR
    (event_name = 'submission.submitted'
      AND submission_id IS NOT NULL AND validation_result_id IS NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NULL AND score IS NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NULL)
    OR
    (event_name = 'validation.result_recorded'
      AND submission_id IS NOT NULL AND validation_result_id IS NOT NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NOT NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NULL)
    OR
    (event_name = 'evidence.recorded'
      AND submission_id IS NOT NULL AND evidence_id IS NOT NULL AND skill_id IS NOT NULL
      AND outcome IS NULL AND evidence_kind IS NOT NULL AND evidence_source_type IS NOT NULL
      AND guidance_exposure_id IS NULL
      AND ((evidence_source_type = 'manual' AND validation_result_id IS NULL)
        OR (evidence_source_type = 'validation_result' AND validation_result_id IS NOT NULL)))
    OR
    (event_name = 'guidance.hint_revealed'
      AND submission_id IS NULL AND validation_result_id IS NULL AND evidence_id IS NULL
      AND skill_id IS NULL AND outcome IS NULL AND score IS NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NOT NULL
      AND guidance_step_key IS NOT NULL AND guidance_hint_key IS NOT NULL
      AND guidance_solution_key IS NULL)
    OR
    (event_name = 'guidance.solution_revealed'
      AND validation_result_id IS NULL AND evidence_id IS NULL AND skill_id IS NULL
      AND outcome IS NULL AND score IS NULL AND evidence_kind IS NULL
      AND evidence_source_type IS NULL AND guidance_exposure_id IS NOT NULL
      AND guidance_step_key IS NULL AND guidance_hint_key IS NULL
      AND guidance_solution_key IS NOT NULL)
  );

CREATE UNIQUE INDEX learning_events_guidance_exposure_uq
  ON learning_history.learning_events (organization_id, guidance_exposure_id)
  WHERE guidance_exposure_id IS NOT NULL;

-- Keep deterministic history ordering while placing assistance after Attempt start
-- and solution disclosure after Submission.
ALTER TABLE learning_history.learning_events DROP COLUMN event_order;
ALTER TABLE learning_history.learning_events ADD COLUMN event_order smallint
  GENERATED ALWAYS AS (
    CASE event_name
      WHEN 'attempt.started' THEN 10
      WHEN 'guidance.hint_revealed' THEN 15
      WHEN 'submission.submitted' THEN 20
      WHEN 'guidance.solution_revealed' THEN 25
      WHEN 'validation.result_recorded' THEN 30
      WHEN 'evidence.recorded' THEN 40
    END
  ) STORED;

CREATE OR REPLACE FUNCTION learning_history.validate_guidance_learning_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
DECLARE
  source learning_guidance.guidance_exposures%ROWTYPE;
BEGIN
  IF NEW.event_name NOT IN ('guidance.hint_revealed', 'guidance.solution_revealed') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO source
    FROM learning_guidance.guidance_exposures
   WHERE organization_id = NEW.organization_id
     AND id = NEW.guidance_exposure_id;

  IF NOT FOUND
     OR source.enrollment_id IS DISTINCT FROM NEW.enrollment_id
     OR source.attempt_id IS DISTINCT FROM NEW.attempt_id
     OR source.activity_version_id IS DISTINCT FROM NEW.activity_version_id
     OR source.revealed_at IS DISTINCT FROM NEW.occurred_at
     OR source.step_key IS DISTINCT FROM NEW.guidance_step_key
     OR source.hint_key IS DISTINCT FROM NEW.guidance_hint_key
     OR source.solution_key IS DISTINCT FROM NEW.guidance_solution_key
     OR (NEW.event_name = 'guidance.hint_revealed' AND source.kind <> 'hint')
     OR (NEW.event_name = 'guidance.solution_revealed' AND source.kind <> 'professional_solution') THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'Guidance LearningEvent must match its canonical GuidanceExposure';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_history.validate_guidance_learning_event() FROM PUBLIC;
CREATE TRIGGER learning_events_validate_guidance_source
BEFORE INSERT ON learning_history.learning_events
FOR EACH ROW EXECUTE FUNCTION learning_history.validate_guidance_learning_event();

GRANT SELECT, INSERT ON learning_content.guided_build_definitions TO platform_app;
GRANT SELECT, INSERT ON learning_content.guided_build_steps TO platform_app;
GRANT SELECT, INSERT ON learning_content.guided_build_hints TO platform_app;
GRANT SELECT, INSERT ON learning_guidance.guidance_exposures TO platform_app;

ALTER TABLE learning_content.guided_build_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.guided_build_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content.guided_build_hints ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_guidance.guidance_exposures ENABLE ROW LEVEL SECURITY;

CREATE POLICY guided_build_definitions_tenant_policy ON learning_content.guided_build_definitions
  FOR ALL TO platform_app USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
CREATE POLICY guided_build_steps_tenant_policy ON learning_content.guided_build_steps
  FOR ALL TO platform_app USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
CREATE POLICY guided_build_hints_tenant_policy ON learning_content.guided_build_hints
  FOR ALL TO platform_app USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
CREATE POLICY guidance_exposures_tenant_policy ON learning_guidance.guidance_exposures
  FOR ALL TO platform_app USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
