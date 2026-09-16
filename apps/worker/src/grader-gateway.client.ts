import {
  GRADER_PROFILE_FINGERPRINT_HEADER,
  GraderProtocolError,
  isGraderProfileFingerprint,
  validateGraderJobResult,
  type GraderJobRequest,
  type GraderJobResult
} from "@platform/contracts/grader";

const MAX_GATEWAY_RESPONSE_BYTES = 2 * 1024 * 1024;

export class GraderGatewayDispatchError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string
  ) {
    super(message);
    this.name = "GraderGatewayDispatchError";
  }
}

export type GraderGatewayClientOptions = Readonly<{
  baseUrl: string;
  serviceToken: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}>;

function httpFailure(status: number): GraderGatewayDispatchError {
  const retryable =
    status === 401 ||
    status === 403 ||
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500;
  return new GraderGatewayDispatchError(
    `gateway_http_${status}`,
    retryable,
    `Grader Gateway rejected the request with HTTP ${status}.`
  );
}

export class GraderGatewayClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: GraderGatewayClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async dispatch(
    request: GraderJobRequest,
    profileFingerprint: string
  ): Promise<GraderJobResult> {
    if (!isGraderProfileFingerprint(profileFingerprint)) {
      throw new GraderGatewayDispatchError(
        "persisted_profile_fingerprint_invalid",
        false,
        "Persisted grader profile fingerprint is invalid."
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.options.baseUrl}/v1/jobs`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.options.serviceToken}`,
            "content-type": "application/json",
            [GRADER_PROFILE_FINGERPRINT_HEADER]: profileFingerprint
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });
      } catch (error) {
        if (controller.signal.aborted) {
          throw new GraderGatewayDispatchError(
            "gateway_timeout",
            true,
            "Grader Gateway request timed out."
          );
        }
        throw new GraderGatewayDispatchError(
          "gateway_unreachable",
          true,
          "Grader Gateway request failed before an HTTP response was received."
        );
      }

      if (!response.ok) {
        throw httpFailure(response.status);
      }

      const declaredLength = response.headers.get("content-length");
      if (declaredLength !== null) {
        const bytes = Number(declaredLength);
        if (Number.isFinite(bytes) && bytes > MAX_GATEWAY_RESPONSE_BYTES) {
          throw new GraderGatewayDispatchError(
            "gateway_response_too_large",
            true,
            "Grader Gateway response exceeded the worker response limit."
          );
        }
      }

      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > MAX_GATEWAY_RESPONSE_BYTES) {
        throw new GraderGatewayDispatchError(
          "gateway_response_too_large",
          true,
          "Grader Gateway response exceeded the worker response limit."
        );
      }

      let value: unknown;
      try {
        value = JSON.parse(text) as unknown;
      } catch {
        throw new GraderGatewayDispatchError(
          "gateway_invalid_json",
          true,
          "Grader Gateway returned invalid JSON."
        );
      }

      try {
        return validateGraderJobResult(value, request.jobId);
      } catch (error) {
        if (error instanceof GraderProtocolError) {
          throw new GraderGatewayDispatchError(
            "gateway_protocol_error",
            true,
            "Grader Gateway returned a result that failed protocol validation."
          );
        }
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
