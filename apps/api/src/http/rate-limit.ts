import { createHmac } from "node:crypto";

import {
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { DatabaseService } from "../database/database.service";
import { recordRateLimitEvent } from "../observability/public-launch-operational-events";

/** Requests a client may make per fixed window (ADR-0070). */
export const RATE_LIMIT_RULES = {
  "auth.login": [
    { scope: "ip", limit: 20, windowSeconds: 600 },
    { scope: "email", limit: 10, windowSeconds: 600 }
  ],
  "auth.register": [{ scope: "ip", limit: 5, windowSeconds: 3600 }],
  "auth.password_reset_request": [
    { scope: "ip", limit: 20, windowSeconds: 3600 },
    { scope: "email", limit: 5, windowSeconds: 3600 }
  ],
  "auth.password_reset_confirm": [
    { scope: "ip", limit: 20, windowSeconds: 600 }
  ],
  "learning.quiz_check": [{ scope: "ip", limit: 120, windowSeconds: 600 }],
  "learning.assignment_submit": [
    { scope: "ip", limit: 30, windowSeconds: 600 }
  ],
  "telemetry.web": [{ scope: "ip", limit: 60, windowSeconds: 60 }]
} as const satisfies Record<
  string,
  readonly { scope: "ip" | "email"; limit: number; windowSeconds: number }[]
>;

export type RateLimitRule = keyof typeof RATE_LIMIT_RULES;

const RULE_KEY = "platform:rate-limit";

/** Limits the route by the named rule; see RATE_LIMIT_RULES. */
export const RateLimit = (rule: RateLimitRule) => SetMetadata(RULE_KEY, rule);

type LimitedRequest = {
  ip?: string;
  body?: unknown;
  headers: Readonly<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim() || null;

/**
 * The client address. On Vercel the edge sets the forwarding headers itself,
 * so they are trusted there; anywhere else only the socket address counts, so
 * a caller cannot pick its own bucket.
 */
export function clientAddress(
  request: LimitedRequest,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (env.VERCEL === "1") {
    const forwarded =
      first(request.headers["x-vercel-forwarded-for"]) ??
      first(request.headers["x-real-ip"]) ??
      first(request.headers["x-forwarded-for"]);
    if (forwarded) return forwarded;
  }
  return request.ip ?? "unknown";
}

function requestEmail(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("email" in body))
    return null;
  const email = body.email;
  return typeof email === "string" && email.length <= 320
    ? email.trim().toLowerCase()
    : null;
}

/** HMAC of the rule, scope and value: the database never sees the address or email. */
export function rateLimitKey(
  secret: string,
  rule: RateLimitRule,
  scope: string,
  value: string
): Buffer {
  return createHmac("sha256", secret)
    .update(`${rule}\u0000${scope}\u0000${value}`)
    .digest();
}

export type RateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

@Injectable()
export class RateLimitService {
  constructor(private readonly database: DatabaseService) {}

  /** Off without RATE_LIMIT_KEY; fails open if the counter cannot be reached. */
  async consume(
    rule: RateLimitRule,
    request: LimitedRequest,
    now = Date.now()
  ): Promise<RateLimitDecision> {
    const secret = process.env.RATE_LIMIT_KEY?.trim();
    if (!secret) return { allowed: true };

    const values = {
      ip: clientAddress(request),
      email: requestEmail(request.body)
    };
    let retryAfterSeconds = 0;
    try {
      for (const limit of RATE_LIMIT_RULES[rule]) {
        const value = values[limit.scope];
        if (value === null) continue;
        const hits = await this.database.transaction(async (tx) => {
          const result = await tx.client.query<{ hits: number }>(
            "SELECT platform_internal.hit_rate_limit($1, $2) AS hits",
            [
              rateLimitKey(secret, rule, limit.scope, value),
              limit.windowSeconds
            ]
          );
          return result.rows[0]?.hits ?? 0;
        });
        if (hits > limit.limit) {
          const windowMs = limit.windowSeconds * 1000;
          retryAfterSeconds = Math.max(
            retryAfterSeconds,
            Math.ceil((windowMs - (now % windowMs)) / 1000)
          );
        }
      }
    } catch {
      recordRateLimitEvent("misconfigured", "rate_limiter_unavailable");
      return { allowed: true };
    }
    if (retryAfterSeconds > 0) {
      recordRateLimitEvent("rejected", "rate_limit_exceeded");
      return { allowed: false, retryAfterSeconds };
    }
    return { allowed: true };
  }
}

type ReplyWithHeader = { header(name: string, value: string): unknown };

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limits: RateLimitService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.get<RateLimitRule | undefined>(
      RULE_KEY,
      context.getHandler()
    );
    if (rule === undefined) return true;
    const http = context.switchToHttp();
    const decision = await this.limits.consume(
      rule,
      http.getRequest<LimitedRequest>()
    );
    if (decision.allowed) return true;
    http
      .getResponse<ReplyWithHeader>()
      .header("Retry-After", String(decision.retryAfterSeconds));
    throw new HttpException(
      "Too many requests. Try again later.",
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
