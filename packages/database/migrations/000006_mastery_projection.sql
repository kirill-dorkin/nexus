-- Recomputable learner mastery projection derived exclusively from append-only Evidence.
-- Mastery is mutable/rebuildable state; Evidence remains the source of truth.

CREATE TABLE learning_progress.mastery_projections (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  algorithm_key text NOT NULL
    CHECK (
      char_length(algorithm_key) BETWEEN 2 AND 80
      AND algorithm_key ~ '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$'
    ),
  algorithm_version integer NOT NULL CHECK (algorithm_version > 0),
  mastery_score numeric(6,5)
    CHECK (mastery_score IS NULL OR (mastery_score >= 0 AND mastery_score <= 1)),
  evidence_count integer NOT NULL CHECK (evidence_count > 0),
  scored_evidence_count integer NOT NULL CHECK (scored_evidence_count >= 0),
  score_total numeric(14,5) NOT NULL CHECK (score_total >= 0),
  last_evidence_at timestamptz NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id, skill_id),
  FOREIGN KEY (organization_id, user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, skill_id)
    REFERENCES learning_content.skills(organization_id, id)
    ON DELETE RESTRICT,
  CHECK (scored_evidence_count <= evidence_count),
  CHECK (score_total <= scored_evidence_count),
  CHECK (
    (scored_evidence_count = 0 AND score_total = 0 AND mastery_score IS NULL)
    OR
    (scored_evidence_count > 0 AND mastery_score IS NOT NULL)
  )
);

CREATE INDEX mastery_projections_skill_idx
  ON learning_progress.mastery_projections
    (organization_id, skill_id, mastery_score, user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON learning_progress.mastery_projections
  TO platform_app;

ALTER TABLE learning_progress.mastery_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY mastery_projections_app_tenant_policy
  ON learning_progress.mastery_projections
  FOR ALL
  TO platform_app
  USING (organization_id = platform_internal.current_organization_id())
  WITH CHECK (organization_id = platform_internal.current_organization_id());
