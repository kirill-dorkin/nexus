import type {
  CreateGuidedBuildDefinitionRequest,
  GuidedBuildDefinition
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

export type GuidedBuildHintMaterial = Readonly<{
  stepKey: string;
  hintKey: string;
  content: string;
}>;

export type GuidedBuildSolutionMaterial = Readonly<{
  solutionKey: string;
  title: string;
  content: string;
}>;

export type NewGuidedBuildDefinition = Readonly<{
  organizationId: string;
  activityVersionId: string;
  definition: CreateGuidedBuildDefinitionRequest;
}>;

export abstract class GuidedBuildContentRepository {
  abstract createDefinition(
    transaction: DatabaseTransaction,
    input: NewGuidedBuildDefinition
  ): Promise<GuidedBuildDefinition>;

  abstract findDefinition(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string
  ): Promise<GuidedBuildDefinition | null>;

  abstract findHintMaterial(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    stepKey: string,
    hintKey: string
  ): Promise<GuidedBuildHintMaterial | null>;

  abstract findSolutionMaterial(
    transaction: DatabaseTransaction,
    organizationId: string,
    activityVersionId: string,
    solutionKey: string
  ): Promise<GuidedBuildSolutionMaterial | null>;
}
