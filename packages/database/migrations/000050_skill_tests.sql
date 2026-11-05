-- Skill tests (ADR-0075): a skill is confirmed by a test of questions drawn from a protected bank.
-- Additive: nothing reads these tables until the API starts importing banks and serving tests.

-- The question bank of a `skill.test` activity version: questions, answers and explanations.
-- Protected authoring state like quiz answer keys (ADR-0053) and assignment checks (ADR-0073):
-- NEVER merged into learner-visible Activity config, readable only inside the owning
-- organization, immutable once the course version is published.
CREATE TABLE learning_content.skill_test_banks (
  organization_id uuid NOT NULL,
  course_version_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  config jsonb NOT NULL CHECK (
    jsonb_typeof(config) = 'object'
    AND jsonb_typeof(config -> 'questions') = 'array'
    AND jsonb_array_length(config -> 'questions') BETWEEN 1 AND 400
  ),
  PRIMARY KEY (activity_version_id),
  FOREIGN KEY (organization_id, course_version_id, activity_version_id)
    REFERENCES learning_content.course_version_activities (organization_id, course_version_id, id)
    ON DELETE CASCADE
);

CREATE TRIGGER skill_test_banks_require_draft
  BEFORE INSERT OR UPDATE OR DELETE ON learning_content.skill_test_banks
  FOR EACH ROW EXECUTE FUNCTION learning_content.require_draft_course_version_graph();

CREATE TRIGGER skill_test_banks_revision
  AFTER INSERT OR UPDATE OR DELETE ON learning_content.skill_test_banks
  FOR EACH ROW EXECUTE FUNCTION learning_content.bump_authoring_revision();

ALTER TABLE learning_content.skill_test_banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_test_banks_tenant ON learning_content.skill_test_banks
  FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

GRANT SELECT, INSERT, DELETE ON learning_content.skill_test_banks TO platform_app;

-- One draw of a skill test for a learner's own Enrollment: which questions the server showed.
-- The id is the learner's draw key (a UUID), so a repeated start returns the same draw. The
-- submission is checked against exactly these questions; `attempt_id` links the draw to the
-- Attempt it became and is written once.
CREATE TABLE learning_progress.skill_test_draws (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  activity_version_id uuid NOT NULL,
  question_keys text[] NOT NULL CHECK (
    cardinality(question_keys) BETWEEN 1 AND 200
    AND array_position(question_keys, NULL) IS NULL
  ),
  drawn_at timestamptz NOT NULL DEFAULT now(),
  attempt_id uuid,
  UNIQUE (organization_id, id),
  UNIQUE (attempt_id),
  FOREIGN KEY (organization_id, enrollment_id)
    REFERENCES learning_delivery.enrollments (organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, activity_version_id)
    REFERENCES learning_content.course_version_activities (organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, attempt_id)
    REFERENCES learning_progress.attempts (organization_id, id)
    ON DELETE RESTRICT
);

-- Retake cooldown and «least recently seen» look up a learner's latest draws of one test.
CREATE INDEX skill_test_draws_enrollment_activity
  ON learning_progress.skill_test_draws (organization_id, enrollment_id, activity_version_id, drawn_at DESC);

-- A draw is immutable except for linking it once to its Attempt.
CREATE FUNCTION learning_progress.protect_skill_test_draw()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id
     OR NEW.activity_version_id IS DISTINCT FROM OLD.activity_version_id
     OR NEW.question_keys IS DISTINCT FROM OLD.question_keys
     OR NEW.drawn_at IS DISTINCT FROM OLD.drawn_at
     OR (OLD.attempt_id IS NOT NULL AND NEW.attempt_id IS DISTINCT FROM OLD.attempt_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'skill test draws are immutable once drawn and linked once';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION learning_progress.protect_skill_test_draw() FROM PUBLIC;

CREATE TRIGGER skill_test_draws_protect
  BEFORE UPDATE ON learning_progress.skill_test_draws
  FOR EACH ROW EXECUTE FUNCTION learning_progress.protect_skill_test_draw();

ALTER TABLE learning_progress.skill_test_draws ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_test_draws_tenant ON learning_progress.skill_test_draws
  FOR ALL TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());

GRANT SELECT, INSERT ON learning_progress.skill_test_draws TO platform_app;
GRANT UPDATE (attempt_id) ON learning_progress.skill_test_draws TO platform_app;
