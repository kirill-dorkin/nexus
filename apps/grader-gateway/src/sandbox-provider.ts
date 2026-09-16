import type { GraderJobRequest, GraderJobResult } from "./protocol.js";
import type { ResolvedGraderExecutionProfile } from "./execution-profile.js";

export abstract class SandboxProvider {
  abstract execute(
    request: GraderJobRequest,
    profile: ResolvedGraderExecutionProfile
  ): Promise<unknown>;
}

export class UnavailableSandboxProvider extends SandboxProvider {
  async execute(request: GraderJobRequest): Promise<GraderJobResult> {
    return {
      protocolVersion: 1,
      jobId: request.jobId,
      status: "system_error",
      error: {
        code: "sandbox_provider_unavailable",
        retryable: true
      }
    };
  }
}
