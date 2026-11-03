import { randomUUID } from "node:crypto";

import {
  withTransaction,
  type DatabasePool,
  type DatabaseTransaction
} from "@platform/database";

type RoutingStatus =
  | "mapped"
  | "unmapped_installation"
  | "unmapped_repository"
  | "repository_mismatch"
  | "not_applicable";

type ClaimRow = {
  inbox_id: string;
  event_name: "installation" | "installation_repositories";
  action: string | null;
  github_installation_id: string | null;
  payload: unknown;
  routing_status: RoutingStatus;
  organization_id: string | null;
  attempt_count: number;
  failure_count: number;
};

type Claim = Readonly<{
  inboxId: string;
  eventName: "installation" | "installation_repositories";
  action: string | null;
  githubInstallationId: string | null;
  payload: Readonly<Record<string, unknown>>;
  routingStatus: RoutingStatus;
  organizationId: string | null;
  attemptCount: number;
  failureCount: number;
}>;

type RepoSnapshot = Readonly<{
  id: string;
  fullName: string | null;
}>;

class RejectedDeliveryError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "RejectedDeliveryError";
  }
}

function object(value: unknown, field: string): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RejectedDeliveryError("invalid_payload", `${field} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function array(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new RejectedDeliveryError("invalid_payload", `${field} must be an array.`);
  }
  return value;
}

function externalId(value: unknown, field: string): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new RejectedDeliveryError(
      "invalid_payload",
      `${field} must be a positive safe integer.`
    );
  }
  return String(value);
}

function repositories(
  value: unknown,
  field: string,
  requireFullName: boolean
): readonly RepoSnapshot[] {
  return array(value, field).map((entry, index) => {
    const repo = object(entry, `${field}[${index}]`);
    const id = externalId(repo.id, `${field}[${index}].id`);
    const fullName = repo.full_name;
    if (requireFullName) {
      if (
        typeof fullName !== "string" ||
        fullName.trim().length < 3 ||
        fullName.trim().length > 260
      ) {
        throw new RejectedDeliveryError(
          "invalid_payload",
          `${field}[${index}].full_name is invalid.`
        );
      }
      return { id, fullName: fullName.trim() };
    }
    return { id, fullName: typeof fullName === "string" ? fullName.trim() : null };
  });
}

export type GitHubWebhookLifecycleProcessorOptions = Readonly<{
  leaseSeconds?: number;
  maxAttempts?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
}>;

export class GitHubWebhookLifecycleProcessor {
  private readonly leaseSeconds: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;

  constructor(
    private readonly pool: DatabasePool,
    options: GitHubWebhookLifecycleProcessorOptions = {}
  ) {
    this.leaseSeconds = options.leaseSeconds ?? 60;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryBaseMs = options.retryBaseMs ?? 5_000;
    this.retryMaxMs = options.retryMaxMs ?? 300_000;
    if (this.leaseSeconds < 1 || this.leaseSeconds > 900) {
      throw new Error("leaseSeconds must be between 1 and 900.");
    }
    if (this.maxAttempts < 1) throw new Error("maxAttempts must be positive.");
  }

  async processOne(): Promise<boolean> {
    const leaseToken = randomUUID();
    const claim = await withTransaction(this.pool, (tx) => this.claim(tx, leaseToken));
    if (claim === null) return false;

    if (
      claim.routingStatus === "unmapped_installation" ||
      claim.routingStatus === "unmapped_repository"
    ) {
      await withTransaction(this.pool, (tx) =>
        this.finish(tx, claim.inboxId, leaseToken, "blocked", claim.routingStatus, null)
      );
      return true;
    }

    const organizationId = claim.organizationId;
    if (claim.routingStatus !== "mapped" || organizationId === null) {
      await withTransaction(this.pool, (tx) =>
        this.finish(tx, claim.inboxId, leaseToken, "rejected", "routing_rejected", null)
      );
      return true;
    }

    try {
      await withTransaction(this.pool, async (tx) => {
        await tx.client.query("SELECT set_config('app.organization_id', $1, true)", [
          organizationId
        ]);
        await this.apply(tx, claim, organizationId);
        const finished = await this.finish(
          tx,
          claim.inboxId,
          leaseToken,
          "completed",
          null,
          null
        );
        if (!finished) throw new Error("Lifecycle processing lease was lost.");
      });
    } catch (error) {
      if (error instanceof RejectedDeliveryError) {
        await withTransaction(this.pool, (tx) =>
          this.finish(tx, claim.inboxId, leaseToken, "rejected", error.code, null)
        );
        return true;
      }

      const nextFailureCount = claim.failureCount + 1;
      const terminal = nextFailureCount >= this.maxAttempts;
      const delay = Math.min(
        this.retryMaxMs,
        this.retryBaseMs * 2 ** Math.max(0, Math.min(nextFailureCount - 1, 10))
      );
      await withTransaction(this.pool, (tx) =>
        this.finish(
          tx,
          claim.inboxId,
          leaseToken,
          terminal ? "dead_letter" : "retryable",
          "processor_failure",
          terminal ? null : new Date(Date.now() + delay)
        )
      );
    }

    return true;
  }

  private async claim(tx: DatabaseTransaction, leaseToken: string): Promise<Claim | null> {
    const result = await tx.client.query<ClaimRow>(
      `SELECT
         inbox_id::text,
         event_name,
         action,
         github_installation_id::text,
         payload,
         routing_status,
         organization_id::text,
         attempt_count,
         failure_count
       FROM platform_internal.claim_github_webhook_lifecycle($1, $2)`,
      [leaseToken, this.leaseSeconds]
    );
    const row = result.rows[0];
    if (row === undefined) return null;
    return {
      inboxId: row.inbox_id,
      eventName: row.event_name,
      action: row.action,
      githubInstallationId: row.github_installation_id,
      payload: object(row.payload, "payload"),
      routingStatus: row.routing_status,
      organizationId: row.organization_id,
      attemptCount: row.attempt_count,
      failureCount: row.failure_count
    };
  }

  private async apply(tx: DatabaseTransaction, claim: Claim, organizationId: string): Promise<void> {
    const installationId = this.installationId(claim);
    if (claim.eventName === "installation") {
      await this.installationEvent(tx, organizationId, installationId, claim.action);
      return;
    }
    await this.repositoryEvent(
      tx,
      organizationId,
      installationId,
      claim.action,
      claim.payload
    );
  }

  private installationId(claim: Claim): string {
    if (claim.githubInstallationId === null) {
      throw new RejectedDeliveryError(
        "invalid_routing_identity",
        "Lifecycle delivery is missing installation identity."
      );
    }
    const installation = object(claim.payload.installation, "payload.installation");
    const payloadId = externalId(installation.id, "payload.installation.id");
    if (payloadId !== claim.githubInstallationId) {
      throw new RejectedDeliveryError(
        "routing_identity_mismatch",
        "Payload installation identity differs from the accepted inbox identity."
      );
    }
    return payloadId;
  }

  private async installationEvent(
    tx: DatabaseTransaction,
    organizationId: string,
    installationId: string,
    action: string | null
  ): Promise<void> {
    if (action === "created" || action === "new_permissions_accepted") return;

    if (action === "deleted") {
      await tx.client.query(
        `UPDATE integrations.github_installations
         SET status = 'removed', updated_at = now()
         WHERE organization_id = $1 AND github_installation_id = $2`,
        [organizationId, installationId]
      );
      await tx.client.query(
        `UPDATE integrations.github_repositories
         SET status = 'removed', updated_at = now()
         WHERE organization_id = $1 AND github_installation_id = $2`,
        [organizationId, installationId]
      );
      return;
    }

    if (action === "suspend" || action === "unsuspend") {
      const installationStatus = action === "suspend" ? "suspended" : "active";
      const fromRepositoryStatus = action === "suspend" ? "active" : "suspended";
      const toRepositoryStatus = action === "suspend" ? "suspended" : "active";
      await tx.client.query(
        `UPDATE integrations.github_installations
         SET status = $3, updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND status <> 'removed'`,
        [organizationId, installationId, installationStatus]
      );
      await tx.client.query(
        `UPDATE integrations.github_repositories
         SET status = $4, updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND status = $3`,
        [organizationId, installationId, fromRepositoryStatus, toRepositoryStatus]
      );
      if (action === "unsuspend") {
        await this.refreshRoutes(tx, organizationId, installationId);
      }
      return;
    }

    throw new RejectedDeliveryError("unsupported_action", "Unsupported installation action.");
  }

  private async repositoryEvent(
    tx: DatabaseTransaction,
    organizationId: string,
    installationId: string,
    action: string | null,
    payload: Readonly<Record<string, unknown>>
  ): Promise<void> {
    if (action !== "added" && action !== "removed") {
      throw new RejectedDeliveryError(
        "unsupported_action",
        "Unsupported installation_repositories action."
      );
    }

    const added = repositories(payload.repositories_added, "payload.repositories_added", true);
    const removed = repositories(payload.repositories_removed, "payload.repositories_removed", false);
    const installation = await tx.client.query<{ status: "active" | "suspended" | "removed" }>(
      `SELECT status
       FROM integrations.github_installations
       WHERE organization_id = $1 AND github_installation_id = $2`,
      [organizationId, installationId]
    );
    const installationStatus = installation.rows[0]?.status;
    if (installationStatus === undefined || installationStatus === "removed") return;

    if (action === "added") {
      const targetStatus = installationStatus === "suspended" ? "suspended" : "active";
      for (const repo of added) {
        const inserted = await tx.client.query<{ id: string }>(
          `INSERT INTO integrations.github_repositories (
             organization_id, github_installation_id, github_repository_id, full_name, status
           ) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (github_repository_id) DO NOTHING
           RETURNING id::text`,
          [organizationId, installationId, repo.id, repo.fullName, targetStatus]
        );
        if (inserted.rows[0] !== undefined) continue;
        const updated = await tx.client.query<{ id: string }>(
          `UPDATE integrations.github_repositories
           SET full_name = $4, status = $5, updated_at = now()
           WHERE organization_id = $1
             AND github_installation_id = $2
             AND github_repository_id = $3
           RETURNING id::text`,
          [organizationId, installationId, repo.id, repo.fullName, targetStatus]
        );
        if (updated.rows[0] === undefined) {
          throw new RejectedDeliveryError(
            "repository_ownership_conflict",
            "Repository identity is already owned by another integration mapping."
          );
        }
      }
      if (installationStatus === "active") {
        await this.refreshRoutes(tx, organizationId, installationId);
      }
      return;
    }

    for (const repo of removed) {
      await tx.client.query(
        `UPDATE integrations.github_repositories
         SET status = 'removed', updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND github_repository_id = $3`,
        [organizationId, installationId, repo.id]
      );
    }
  }

  private async refreshRoutes(
    tx: DatabaseTransaction,
    organizationId: string,
    installationId: string
  ): Promise<void> {
    await tx.client.query(
      `SELECT platform_internal.refresh_github_webhook_routes_for_installation($1, $2)`,
      [organizationId, installationId]
    );
  }

  private async finish(
    tx: DatabaseTransaction,
    inboxId: string,
    leaseToken: string,
    outcome: "blocked" | "retryable" | "completed" | "rejected" | "dead_letter",
    errorCode: string | null,
    availableAt: Date | null
  ): Promise<boolean> {
    const result = await tx.client.query<{ finished: boolean }>(
      `SELECT platform_internal.finish_github_webhook_lifecycle($1, $2, $3, $4, $5)
         AS finished`,
      [inboxId, leaseToken, outcome, errorCode, availableAt]
    );
    return result.rows[0]?.finished === true;
  }
}
