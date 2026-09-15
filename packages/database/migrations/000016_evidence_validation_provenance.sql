-- F4: explicit Evidence provenance and idempotent trusted ValidationResult materialization.

ALTER TABLE learning_progress.evidence
  ADD COLUMN source_type text NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'validation_result')),
  ADD COLUMN source_validation_result_id uuid;

ALTER TABLE learning_progress.evidence
  ADD CONSTRAINT evidence_validation_result_fk
    FOREIGN KEY (organization_id, source_validation_result_id)
    REFERENCES learning_validation.validation_results(organization_id, id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT evidence_source_shape_check
    CHECK (
      (source_type = 'manual' AND source_validation_result_id IS NULL)
      OR
      (
        source_type = 'validation_result'
        AND source_validation_result_id IS NOT NULL
        AND recorded_by_user_id IS NULL
      )
    );

CREATE UNIQUE INDEX evidence_validation_result_skill_uq
  ON learning_progress.evidence
    (organization_id, source_validation_result_id, skill_id)
  WHERE source_type = 'validation_result';

CREATE OR REPLACE FUNCTION learning_progress.validate_evidence_validation_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.source_type = 'validation_result' THEN
    IF NOT EXISTS (
      SELECT 1
        FROM learning_validation.validation_results AS result
       WHERE result.organization_id = NEW.organization_id
         AND result.id = NEW.source_validation_result_id
         AND result.submission_id = NEW.submission_id
         AND result.status = 'completed'
         AND result.evidence_trust = 'trusted'
         AND result.outcome IN ('passed', 'failed')
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'validation-derived evidence requires a completed trusted decisive result for the same submission';
    END IF;
  END IF;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION learning_progress.validate_evidence_validation_source() FROM PUBLIC;

CREATE TRIGGER evidence_validate_validation_source
BEFORE INSERT ON learning_progress.evidence
FOR EACH ROW EXECUTE FUNCTION learning_progress.validate_evidence_validation_source();
