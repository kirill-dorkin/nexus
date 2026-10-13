import {
  GraderProtocolError,
  validateGraderJobRequest,
  type GraderJobResult,
  type SystemErrorGraderJobResult
} from "@platform/contracts/grader";

import { GraderGatewayClient, GraderGatewayDispatchError } from "./grader-gateway.client.js";
import { GraderJobRepository, type ClaimedGraderJob } from "./grader-job.repository.js";

export type GraderDispatchCycle =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "lease_lost"; jobId: string; attemptCount: number }>
  | Readonly<{
      kind: "retryable";
      jobId: string;
      attemptCount: number;
      errorCode: string;
      nextState: "retryable" | "dead_letter";
    }>
  | Readonly<{
      kind: "terminal";
      jobId: string;
      attemptCount: number;
      graderStatus: "completed" | "system_error";
      validationResultId: string;
    }>;

export type GraderDispatcherOptions = Readonly<{
  leaseSeconds: number;
  retryBaseMs: number;
  retryMaxMs: number;
  now?: () => Date;
}>;

function systemError(jobId: string, code: string): SystemErrorGraderJobResult {
  return {
    protocolVersion: 1,
    jobId,
    status: "system_error",
    error: { code, retryable: false }
  };
}

function retryDelayMs(attemptCount: number, baseMs: number, maxMs: number): number {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 20));
  return Math.min(maxMs, baseMs * 2 ** exponent);
}

export class GraderJobDispatcher {
  private readonly now: () => Date;

  constructor(
    private readonly jobs: GraderJobRepository,
    private readonly gateway: GraderGatewayClient,
    private readonly options: GraderDispatcherOptions
  ) {
    this.now = options.now ?? (() => new Date());
  }

  private async acknowledge(
    job: ClaimedGraderJob,
    result: GraderJobResult
  ): Promise<GraderDispatchCycle> {
    const validationResultId = await this.jobs.acknowledge(job, result);
    if (validationResultId === null) {
      return { kind: "lease_lost", jobId: job.jobId, attemptCount: job.attemptCount };
    }
    return {
      kind: "terminal",
      jobId: job.jobId,
      attemptCount: job.attemptCount,
      graderStatus: result.status,
      validationResultId
    };
  }

  private async retry(
    job: ClaimedGraderJob,
    errorCode: string
  ): Promise<GraderDispatchCycle> {
    const delay = retryDelayMs(
      job.attemptCount,
      this.options.retryBaseMs,
      this.options.retryMaxMs
    );
    const retryAt = new Date(this.now().getTime() + delay);
    const nextState = await this.jobs.fail(job, errorCode, retryAt);
    if (nextState === null) {
      return { kind: "lease_lost", jobId: job.jobId, attemptCount: job.attemptCount };
    }
    return {
      kind: "retryable",
      jobId: job.jobId,
      attemptCount: job.attemptCount,
      errorCode,
      nextState
    };
  }

  async runOnce(): Promise<GraderDispatchCycle> {
    const job = await this.jobs.claim(this.options.leaseSeconds);
    if (job === null) return { kind: "idle" };

    try {
      if (job.request.jobId !== job.jobId) {
        return this.acknowledge(job, systemError(job.jobId, "persisted_job_identity_mismatch"));
      }
      try {
        validateGraderJobRequest(job.request);
      } catch (error) {
        if (error instanceof GraderProtocolError || error instanceof TypeError) {
          return this.acknowledge(job, systemError(job.jobId, "persisted_grader_request_invalid"));
        }
        throw error;
      }

      let result: GraderJobResult;
      try {
        result = await this.gateway.dispatch(job.request, job.profileFingerprint);
      } catch (error) {
        if (error instanceof GraderGatewayDispatchError) {
          if (error.retryable) return this.retry(job, error.code);
          return this.acknowledge(job, systemError(job.jobId, error.code));
        }
        return this.retry(job, "worker_dispatch_error");
      }

      if (result.status === "system_error" && result.error.retryable) {
        return this.retry(job, result.error.code);
      }

      return this.acknowledge(job, result);
    } catch (error) {
      if (error instanceof GraderGatewayDispatchError && error.retryable) {
        return this.retry(job, error.code);
      }
      throw error;
    }
  }
}
