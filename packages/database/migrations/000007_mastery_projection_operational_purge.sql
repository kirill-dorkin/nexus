-- Mastery projections are rebuildable derived state and must not block controlled
-- hard purge of their source membership or stable Skill identity.
-- Application code still cannot delete Skills directly, and referential integrity
-- remains strict: the projection is removed with its source instead of orphaned.

ALTER TABLE learning_progress.mastery_projections
  DROP CONSTRAINT mastery_projections_organization_id_user_id_fkey,
  ADD CONSTRAINT mastery_projections_organization_id_user_id_fkey
    FOREIGN KEY (organization_id, user_id)
    REFERENCES organizations.memberships(organization_id, user_id)
    ON DELETE CASCADE;

ALTER TABLE learning_progress.mastery_projections
  DROP CONSTRAINT mastery_projections_organization_id_skill_id_fkey,
  ADD CONSTRAINT mastery_projections_organization_id_skill_id_fkey
    FOREIGN KEY (organization_id, skill_id)
    REFERENCES learning_content.skills(organization_id, id)
    ON DELETE CASCADE;
