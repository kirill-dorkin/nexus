import { readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const MAX_CONTROL_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_ERROR_RESPONSE_BYTES = 64 * 1024;

export class KubernetesApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly responseBody: string,
    message: string
  ) {
    super(message);
    this.name = "KubernetesApiError";
  }
}

export class KubernetesApiTransportError extends Error {
  constructor(readonly code: "timeout" | "unreachable" | "response_too_large", message: string) {
    super(message);
    this.name = "KubernetesApiTransportError";
  }
}

export type KubernetesApiClientOptions = Readonly<{
  apiUrl: string;
  serviceAccountTokenFile: string;
  caCertificate: string | null;
  requestTimeoutMs: number;
}>;

type RequestResult = Readonly<{
  statusCode: number;
  body: string;
}>;

export class KubernetesApiClient {
  private readonly baseUrl: URL;

  constructor(private readonly options: KubernetesApiClientOptions) {
    this.baseUrl = new URL(options.apiUrl);
  }

  private serviceAccountToken(): string {
    try {
      const token = readFileSync(this.options.serviceAccountTokenFile, "utf8").trim();
      if (token.length === 0) throw new Error("empty token");
      return token;
    } catch {
      throw new KubernetesApiTransportError(
        "unreachable",
        "Kubernetes ServiceAccount credential is unavailable."
      );
    }
  }

  private request(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body: string | null,
    maxResponseBytes: number,
    accept: string
  ): Promise<RequestResult> {
    const url = new URL(path, this.baseUrl);
    if (url.origin !== this.baseUrl.origin) {
      return Promise.reject(
        new KubernetesApiTransportError("unreachable", "Kubernetes request escaped configured origin.")
      );
    }

    let token: string;
    try {
      token = this.serviceAccountToken();
    } catch (error) {
      return Promise.reject(error);
    }

    return new Promise<RequestResult>((resolve, reject) => {
      let settled = false;
      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };
      const finishResolve = (result: RequestResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const headers: Record<string, string> = {
        accept,
        authorization: `Bearer ${token}`,
        "user-agent": "platform-grader-gateway"
      };
      if (body !== null) {
        headers["content-type"] = "application/json";
        headers["content-length"] = String(Buffer.byteLength(body, "utf8"));
      }

      const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
      const request = transport(
        url,
        {
          method,
          headers,
          ...(url.protocol === "https:"
            ? {
                ca: this.options.caCertificate ?? undefined,
                rejectUnauthorized: true
              }
            : {})
        },
        (response) => {
          const chunks: Buffer[] = [];
          let received = 0;
          response.on("data", (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            received += buffer.byteLength;
            if (received > maxResponseBytes) {
              request.destroy();
              finishReject(
                new KubernetesApiTransportError(
                  "response_too_large",
                  "Kubernetes API response exceeded the configured limit."
                )
              );
              return;
            }
            chunks.push(buffer);
          });
          response.on("end", () => {
            const statusCode = response.statusCode ?? 0;
            finishResolve({
              statusCode,
              body: Buffer.concat(chunks).toString("utf8")
            });
          });
          response.on("error", () => {
            finishReject(
              new KubernetesApiTransportError(
                "unreachable",
                "Kubernetes API response failed before completion."
              )
            );
          });
        }
      );

      request.setTimeout(this.options.requestTimeoutMs, () => {
        request.destroy();
        finishReject(
          new KubernetesApiTransportError("timeout", "Kubernetes API request timed out.")
        );
      });
      request.on("error", () => {
        finishReject(
          new KubernetesApiTransportError(
            "unreachable",
            "Kubernetes API request failed before a complete response was received."
          )
        );
      });

      if (body !== null) request.write(body);
      request.end();
    });
  }

  private ensureSuccess(result: RequestResult, method: string, path: string): RequestResult {
    if (result.statusCode >= 200 && result.statusCode < 300) return result;
    throw new KubernetesApiError(
      result.statusCode,
      result.body.slice(0, MAX_ERROR_RESPONSE_BYTES),
      `Kubernetes API rejected ${method} ${path} with HTTP ${result.statusCode}.`
    );
  }

  async getJson(path: string): Promise<unknown> {
    const result = this.ensureSuccess(
      await this.request("GET", path, null, MAX_CONTROL_RESPONSE_BYTES, "application/json"),
      "GET",
      path
    );
    try {
      return JSON.parse(result.body) as unknown;
    } catch {
      throw new KubernetesApiTransportError(
        "unreachable",
        "Kubernetes API returned invalid JSON."
      );
    }
  }

  async postJson(path: string, body: unknown): Promise<unknown> {
    const serialized = JSON.stringify(body);
    const result = this.ensureSuccess(
      await this.request("POST", path, serialized, MAX_CONTROL_RESPONSE_BYTES, "application/json"),
      "POST",
      path
    );
    try {
      return JSON.parse(result.body) as unknown;
    } catch {
      throw new KubernetesApiTransportError(
        "unreachable",
        "Kubernetes API returned invalid JSON."
      );
    }
  }

  async getText(path: string, maxResponseBytes: number): Promise<string> {
    return this.ensureSuccess(
      await this.request("GET", path, null, maxResponseBytes, "text/plain, */*"),
      "GET",
      path
    ).body;
  }

  async delete(path: string): Promise<void> {
    const result = await this.request(
      "DELETE",
      path,
      null,
      MAX_CONTROL_RESPONSE_BYTES,
      "application/json"
    );
    if (result.statusCode === 404) return;
    this.ensureSuccess(result, "DELETE", path);
  }
}
