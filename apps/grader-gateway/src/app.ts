import { timingSafeEqual } from "node:crypto";

import Fastify, { type FastifyInstance } from "fastify";

import {
  GraderExecutionProfileRegistry,
  GraderJobResourcePolicyError,
  enforceJobResourcePolicy
} from "./execution-profile.js";
import {
  GRADER_PROFILE_FINGERPRINT_HEADER,
  GraderProtocolError,
  graderJobRequestJsonSchema,
  isGraderProfileFingerprint,
  validateGraderJobRequest,
  validateGraderJobResult,
  type GraderJobRequest,
  type GraderJobResult
} from "./protocol.js";
import { SandboxProvider, UnavailableSandboxProvider } from "./sandbox-provider.js";

export type CreateGraderGatewayOptions = Readonly<{
  serviceToken: string;
  profileRegistry?: GraderExecutionProfileRegistry;
  sandboxProvider?: SandboxProvider;
  logger?: boolean;
}>;

function tokenMatches(expected: string, authorization: string | undefined): boolean {
  if (authorization === undefined || !authorization.startsWith("Bearer ")) return false;
  const candidate = authorization.slice("Bearer ".length);
  const expectedBytes = Buffer.from(expected, "utf8");
  const candidateBytes = Buffer.from(candidate, "utf8");
  return (
    expectedBytes.length === candidateBytes.length &&
    timingSafeEqual(expectedBytes, candidateBytes)
  );
}

function hasValidationDetails(error: unknown): error is { validation: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "validation" in error &&
    error.validation !== undefined
  );
}

function systemError(jobId: string, code: string, retryable = true): GraderJobResult {
  return {
    protocolVersion: 1,
    jobId,
    status: "system_error",
    error: { code, retryable }
  };
}

export function createGraderGateway(options: CreateGraderGatewayOptions): FastifyInstance {
  if (Buffer.byteLength(options.serviceToken, "utf8") < 32) {
    throw new Error("GRADER_GATEWAY_SERVICE_TOKEN must contain at least 32 bytes.");
  }

  const profiles = options.profileRegistry ?? new GraderExecutionProfileRegistry();
  const sandbox = options.sandboxProvider ?? new UnavailableSandboxProvider();
  const app = Fastify({ logger: options.logger ?? false });

  app.get("/health", async () => ({ status: "ok", service: "grader-gateway" }));

  app.post<{ Body: GraderJobRequest }>(
    "/v1/jobs",
    {
      schema: { body: graderJobRequestJsonSchema },
      preHandler: async (request, reply) => {
        if (!tokenMatches(options.serviceToken, request.headers.authorization)) {
          return reply.code(401).send({
            error: {
              code: "service_authentication_required",
              message: "Authenticated service identity is required."
            }
          });
        }
      }
    },
    async (request, reply) => {
      try {
        validateGraderJobRequest(request.body);

        const resolved = profiles.find(request.body.profile);
        if (resolved === null) {
          return reply.code(422).send({
            error: {
              code: "execution_profile_not_found",
              message: "Requested grader execution profile is not registered."
            }
          });
        }

        const dispatchedFingerprint = request.headers[GRADER_PROFILE_FINGERPRINT_HEADER];
        if (
          !isGraderProfileFingerprint(dispatchedFingerprint) ||
          dispatchedFingerprint !== resolved.fingerprint
        ) {
          return systemError(
            request.body.jobId,
            "execution_profile_fingerprint_mismatch",
            false
          );
        }

        enforceJobResourcePolicy(request.body, resolved.profile);

        let rawResult: unknown;
        try {
          rawResult = await sandbox.execute(request.body, resolved);
        } catch {
          return systemError(request.body.jobId, "sandbox_provider_failure");
        }

        try {
          const result = validateGraderJobResult(rawResult, request.body.jobId);
          if (
            result.status === "completed" &&
            Buffer.byteLength(JSON.stringify(result.payload), "utf8") >
              resolved.profile.limits.outputBytes
          ) {
            return systemError(request.body.jobId, "sandbox_provider_output_limit_exceeded");
          }
          return result;
        } catch {
          return systemError(request.body.jobId, "sandbox_provider_invalid_result");
        }
      } catch (error) {
        if (error instanceof GraderProtocolError || error instanceof GraderJobResourcePolicyError) {
          return reply.code(422).send({
            error: {
              code: error.code,
              message: error.message
            }
          });
        }
        throw error;
      }
    }
  );

  app.setErrorHandler((error, _request, reply) => {
    if (hasValidationDetails(error)) {
      return reply.code(400).send({
        error: {
          code: "invalid_grader_job_request",
          message: "Grader job request does not match protocol version 1."
        }
      });
    }
    app.log.error(error);
    return reply.code(500).send({
      error: {
        code: "grader_gateway_internal_error",
        message: "Grader Gateway could not process the request."
      }
    });
  });

  return app;
}
