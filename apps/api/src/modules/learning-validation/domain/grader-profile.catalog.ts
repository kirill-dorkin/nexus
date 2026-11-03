import { Injectable } from "@nestjs/common";
import {
  GraderExecutionProfileRegistry,
  parseGraderExecutionProfilesJson,
  type GraderProfileReference,
  type ResolvedGraderExecutionProfile
} from "@platform/contracts/grader";

@Injectable()
export class GraderProfileCatalog {
  private readonly registry: GraderExecutionProfileRegistry;

  constructor() {
    this.registry = new GraderExecutionProfileRegistry(
      parseGraderExecutionProfilesJson(
        process.env.GRADER_EXECUTION_PROFILES_JSON
      )
    );
  }

  find(
    reference: GraderProfileReference
  ): ResolvedGraderExecutionProfile | null {
    return this.registry.find(reference);
  }
}
