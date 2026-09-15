import { Injectable } from "@nestjs/common";
import type { GuidedBuildDefinition } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  GuidedBuildContentRepository,
  type GuidedBuildHintMaterial,
  type GuidedBuildSolutionMaterial,
  type NewGuidedBuildDefinition
} from "../application/guided-build-content.repository";

type DefinitionRow = {
  organization_id: string;
  activity_version_id: string;
  transfer_activity_version_id: string | null;
  solution_key: string;
  solution_title: string;
};

type StepRow = {
  step_key: string;
  title: string;
  instructions: string | null;
};

type HintRow = {
  step_key: string;
  hint_key: string;
};

@Injectable()
export class PostgresGuidedBuildContentRepository extends GuidedBuildContentRepository {
  async createDefinition(
    transaction: DatabaseTransaction,
    input: NewGuidedBuildDefinition
  ): Promise<GuidedBuildDefinition> {
    await transaction.client.query(
      `INSERT INTO learning_content.guided_build_definitions
         (organization_id, activity_version_id, transfer_activity_version_id,
          solution_key, solution_title, solution_content)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.organizationId,
        input.activityVersionId,
        input.definition.transferActivityVersionId,
        input.definition.professionalSolution.key,
        input.definition.professionalSolution.title,
        input.definition.professionalSolution.content
      ]
    );

    for (const [stepPosition, step] of input.definition.steps.entries()) {
      await transaction.client.query(
        `INSERT INTO learning_content.guided_build_steps
           (organization_id, activity_version_id, step_key, title, instructions, position)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          input.organizationId,
          input.activityVersionId,
          step.key,
          step.title,
          step.instructions,
          stepPosition
        ]
      );

      for (const [hintPosition, hint] of step.hints.entries()) {
        await transaction.client.query(
          `INSERT INTO learning_content.guided_build_hints
             (organization_id, activity_version_id, step_key, hint_key, content, position)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            input.organizationId,
            input.activityVersionId,
            step.key,
            hint.key,
            hint.content,
            hintPosition
          ]
        );
      }
    }

    const persisted = await this.findDefinition(
      transaction,
      input.organizationId,
      input.activityVersionId
    );
    if (persisted === null) {
      throw new Error("PostgreSQL did not return the created Guided Build definition.");
    }
    return persisted;
  }

  async findDefinition(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<GuidedBuildDefinition | null> {
    const definitionResult = await transaction.client.query<DefinitionRow>(
      `SELECT organization_id::text, activity_version_id::text,
              transfer_activity_version_id::text, solution_key, solution_title
         FROM learning_content.guided_build_definitions
        WHERE organization_id = $1 AND activity_version_id = $2`,
      [organizationId, activityVersionId]
    );
    const definition = definitionResult.rows[0];
    if (definition === undefined) {
      return null;
    }

    const stepsResult = await transaction.client.query<StepRow>(
      `SELECT step_key, title, instructions
         FROM learning_content.guided_build_steps
        WHERE organization_id = $1 AND activity_version_id = $2
        ORDER BY position, step_key`,
      [organizationId, activityVersionId]
    );
    const hintsResult = await transaction.client.query<HintRow>(
      `SELECT step_key, hint_key
         FROM learning_content.guided_build_hints
        WHERE organization_id = $1 AND activity_version_id = $2
        ORDER BY step_key, position, hint_key`,
      [organizationId, activityVersionId]
    );

    return {
      schemaVersion: 1,
      activityVersionId: definition.activity_version_id,
      steps: stepsResult.rows.map((step) => ({
        key: step.step_key,
        title: step.title,
        instructions: step.instructions,
        hints: hintsResult.rows
          .filter((hint) => hint.step_key === step.step_key)
          .map((hint) => ({ key: hint.hint_key }))
      })),
      professionalSolution: {
        key: definition.solution_key,
        title: definition.solution_title
      },
      transferActivityVersionId: definition.transfer_activity_version_id
    };
  }

  async findHintMaterial(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    stepKey: string,
    hintKey: string
  ): Promise<GuidedBuildHintMaterial | null> {
    const result = await transaction.client.query<{
      step_key: string;
      hint_key: string;
      content: string;
    }>(
      `SELECT step_key, hint_key, content
         FROM learning_content.guided_build_hints
        WHERE organization_id = $1
          AND activity_version_id = $2
          AND step_key = $3
          AND hint_key = $4`,
      [organizationId, activityVersionId, stepKey, hintKey]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : { stepKey: row.step_key, hintKey: row.hint_key, content: row.content };
  }

  async findSolutionMaterial(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    solutionKey: string
  ): Promise<GuidedBuildSolutionMaterial | null> {
    const result = await transaction.client.query<{
      solution_key: string;
      solution_title: string;
      solution_content: string;
    }>(
      `SELECT solution_key, solution_title, solution_content
         FROM learning_content.guided_build_definitions
        WHERE organization_id = $1
          AND activity_version_id = $2
          AND solution_key = $3`,
      [organizationId, activityVersionId, solutionKey]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : {
          solutionKey: row.solution_key,
          title: row.solution_title,
          content: row.solution_content
        };
  }
}
