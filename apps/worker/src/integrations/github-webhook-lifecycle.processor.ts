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
  delivery_id: string;
  event_name: "installation" | "installation_repositories";
  action: string | null;
  github_installation_id: string | null;
  github_repository_id: string | null;
  payload: unknown;
  routing_status: RoutingStatus;
  organization_id: string | null;
  attempt_count: number;
};

type ClaimedDelivery = Readonly<{
  inboxId: string;
  deliveryId: string;
  eventName: "installation" | "installation_repositories";
  action: string | null;
  githubInstallationId: string | null;
  githubRepositoryId: string | null;
  payload: Readonly<Record<string, unknown>>;
  routingStatus: RoutingStatus;
  organizationId: string | null;
  attemptCount: number;
}>;

type RepositorySnapshot = Readonly<{
  githubRepositoryId: string;
  fullName: string | null;
}>;

export type GitHubWebhookLifecycleProcessorOptions = Readonly<{
  leaseSeconds?: number;
  maxAttempts?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
}>;

class RejectedLifecycleDeliveryError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "RejectedLifecycleDeliveryError";
  }
}

const positiveDecimalPattern = /^[1-9][0-9]*$/;
const defaultLeaseSeconds = 60;
const defaultMaxAttempts = 5;
const defaultRetryBaseMs = 5_000;
const defaultRetryMaxMs = 5 * 60_000;

function requireObject(value: unknown, field: string): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RejectedLifecycleDeliveryError(
      "invalid_payload",
      `${field} must be an object.`
    );
  }
  return value as Readonly<Record<string, unknown>>;
}

function requireArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new RejectedLifecycleDeliveryError(
      "invalid_payload",
      `${field} must be an array.`
    );
  }
  return value;
}

function requireExternalId(value: unknown, field: string): string {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new RejectedLifecycleDeliveryError(
      "invalid_payload",
      `${field} must be a positive safe integer.`
    );
  }
  return String(value);
}

function requireInstallationId(
  payload: Readonly<Record<string, unknown>>,
  expectedInstallationId: string | null
): string {
  if (expectedInstallationId === null || !positiveDecimalPattern.test(expectedInstallationId)) {
    throw new RejectedLifecycleDeliveryError(
      "invalid_routing_identity",
      "Lifecycle delivery is missing its installation routing identity."
    );
  }

  const installation = requireObject(payload.installation, "payload.installation");
  const payloadInstallationId = requireExternalId(
    installation.id,
    "payload.installation.id"
  );
  if (payloadInstallationId !== expectedInstallationId) {
    throw new RejectedLifecycleDeliveryError(
      "routing_identity_mismatch",
      "Payload installation identity does not match the accepted inbox identity."
    );
  }
  return expectedInstallationId;
}

function repositorySnapshots(
  value: unknown,
  field: string,
  requireFullName: boolean
): readonly RepositorySnapshot[] {
  return requireArray(value, field).map((entry, index) => {
    const repository = requireObject(entry, `${field}[${index}]`);
    const githubRepositoryId = requireExternalId(
      repository.id,
      `${field}[${index}].id`
    );
    const fullName = repository.full_name;

    if (requireFullName) {
      if (
        typeof fullName !== "string" ||
        fullName.trim().length < 3 ||
        fullName.trim().length > 260
      ) {
        throw new RejectedLifecycleDeliveryError(
          "invalid_payload",
          `${field}[${index}].full_name is invalid.`
        );
      }
      return { githubRepositoryId, fullName: fullName.trim() };
    }

    return {
      githubRepositoryId,
      fullName: typeof fullName === "string" ? fullName.trim() : null
    };
  });
}

function retryDelayMs(
  attemptCount: number,
  baseMs: number,
  maxMs: number
): number {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 10));
  return Math.min(maxMs, baseMs * 2 ** exponent);
}

export class GitHubWebhookLifecycleProcessor {
  private readonly leaseSeconds: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;

  constructor(
    private readonly pool: DatabasePool,
    options: GitHubWebhookLifecycleProcessorOptions = {}
  ) {
    this.leaseSeconds = options.leaseSeconds ?? defaultLeaseSeconds;
    this.maxAttempts = options.maxAttempts ?? defaultMaxAttempts;
    this.retryBaseMs = options.retryBaseMs ?? defaultRetryBaseMs;
    this.retryMaxMs = options.retryMaxMs ?? defaultRetryMaxMs;

    if (this.leaseSeconds < 1 || this.leaseSeconds > 900) {
      throw new Error("leaseSeconds must be between 1 and 900.");
    }
    if (this.maxAttempts < 1) {
      throw new Error("maxAttempts must be positive.");
    }
  }

  async processOne(): Promise<boolean> {
    const leaseToken = randomUUID();
    const claim = await withTransaction(this.pool, (transaction) =>
      this.claim(transaction, leaseToken)
    );
    if (claim === null) return false;

    if (
      claim.routingStatus === "unmapped_installation" ||
      claim.routingStatus === "unmapped_repository"
    ) {
      await withTransaction(this.pool, (transaction) =>
        this.finish(
          transaction,
          claim.inboxId,
          leaseToken,
          "blocked",
          claim.routingStatus,
          null
        )
      );
      return true;
    }

    if (
      claim.routingStatus === "repository_mismatch" ||
      claim.routingStatus === "not_applicable" ||
      claim.organizationId === null
    ) {
      await withTransaction(this.pool, (transaction) =>
        this.finish(
          transaction,
          claim.inboxId,
          leaseToken,
          "rejected",
          "routing_rejected",
          null
        )
      );
      return true;
    }

    try {
      await withTransaction(this.pool, async (transaction) => {
        await transaction.client.query(
          "SELECT set_config('app.organization_id', $1, true)",
          [claim.organizationId]
        );
        await this.applyMappedDelivery(transaction, claim);
        const finished = await this.finish(
          transaction,
          claim.inboxId,
          leaseToken,
          "completed",
          null,
          null
        );
        if (!finished) {
          throw new Error("GitHub lifecycle processing lease was lost before commit.");
        }
      });
      return true;
    } catch (error) {
      if (error instanceof RejectedLifecycleDeliveryError) {
        await withTransaction(this.pool, (transaction) =>
          this.finish(
            transaction,
            claim.inboxId,
            leaseToken,
            "rejected",
            error.code,
            null
          )
        );
        return true;
      }

      const terminal = claim.attemptCount >= this.maxAttempts;
      const availableAt = terminal
        ? null
        : new Date(
            Date.now() +
              retryDelayMs(
                claim.attemptCount,
                this.retryBaseMs,
                this.retryMaxMs
              )
          );
      await withTransaction(this.pool, (transaction) =>
        this.finish(
          transaction,
          claim.inboxId,
          leaseToken,
          terminal ? "dead_letter" : "retryable",
          "processor_failure",
          availableAt
        )
      );
      return true;
    }
  }

  private async claim(
    transaction: DatabaseTransaction,
    leaseToken: string
  ): Promise<ClaimedDelivery | null> {
    const result = await transaction.client.query<ClaimRow>(
      `SELECT
         inbox_id::text,
         delivery_id::text,
         event_name,
         action,
         github_installation_id::text,
         github_repository_id::text,
         payload,
         routing_status,
         organization_id::text,
         attempt_count
       FROM platform_internal.claim_github_webhook_lifecycle($1, $2)`,
      [leaseToken, this.leaseSeconds]
    );
    const row = result.rows[0];
    if (row === undefined) return null;

    if (
      row.event_name !== "installation" &&
      row.event_name !== "installation_repositories"
    ) {
      throw new Error("Lifecycle claim returned an unsupported event family.");
    }

    return {
      inboxId: row.inbox_id,
      deliveryId: row.delivery_id,
      eventName: row.event_name,
      action: row.action,
      githubInstallationId: row.github_installation_id,
      githubRepositoryId: row.github_repository_id,
      payload: requireObject(row.payload, "payload"),
      routingStatus: row.routing_status,
      organizationId: row.organization_id,
      attemptCount: row.attempt_count
    };
  }

  private async applyMappedDelivery(
    transaction: DatabaseTransaction,
    claim: ClaimedDelivery
  ): Promise<void> {
    const installationId = requireInstallationId(
      claim.payload,
      claim.githubInstallationId
    );

    if (claim.eventName === "installation") {
      await this.applyInstallationEvent(
        transaction,
        claim.organizationId as string,
        installationId,
        claim.action
      );
      return;
    }

    await this.applyRepositoryEvent(
      transaction,
      claim.organizationId as string,
      installationId,
      claim.action,
      claim.payload
    );
  }

  private async applyInstallationEvent(
    transaction: DatabaseTransaction,
    organizationId: string,
    installationId: string,
    action: string | null
  ): Promise<void> {
    if (action === "deleted") {
      await transaction.client.query(
        `UPDATE integrations.github_installations
         SET status = 'removed', updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND status <> 'removed'`,
        [organizationId, installationId]
      );
      await transaction.client.query(
        `UPDATE integrations.github_repositories
         SET status = 'removed', updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND status <> 'removed'`,
        [organizationId, installationId]
      );
      return;
    }

    if (action === "suspend") {
      await transaction.client.query(
        `UPDATE integrations.github_installations
         SET status = 'suspended', updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND status = 'active'`,
        [organizationId, installationId]
      );
      await transaction.client.query(
        `UPDATE integrations.github_repositories
         SET status = 'suspended', updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND status = 'active'`,
        [organizationId, installationId]
      );
      return;
    }

    if (action === "unsuspend") {
      await transaction.client.query(
        `UPDATE integrations.github_installations
         SET status = 'active', updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND status = 'suspended'`,
        [organizationId, installationId]
      );
      await transaction.client.query(
        `UPDATE integrations.github_repositories
         SET status = 'active', updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND status = 'suspended'`,
        [organizationId, installationId]
      );
      await transaction.client.query(
        `SELECT platform_internal.refresh_github_webhook_routes_for_installation($1, $2)`,
        [organizationId, installationId]
      );
      return;
    }

    if (action === "created" || action === "new_permissions_accepted") {
      return;
    }

    throw new RejectedLifecycleDeliveryError(
      "unsupported_action",
      `Unsupported installation action: ${action ?? "null"}.`
    );
  }

  private async applyRepositoryEvent(
    transaction: DatabaseTransaction,
    organizationId: string,
    installationId: string,
    action: string | null,
    payload: Readonly<Record<string, unknown>>
  ): Promise<void> {
    if (action !== "added" && action !== "removed") {
      throw new RejectedLifecycleDeliveryError(
        "unsupported_action",
        `Unsupported installation_repositories action: ${action ?? "null"}.`
      );
    }

    const added = repositorySnapshots(
      payload.repositories_added,
      "payload.repositories_added",
      true
    );
    const removed = repositorySnapshots(
      payload.repositories_removed,
      "payload.repositories_removed",
      false
    );

    const installation = await transaction.client.query<{
      status: "active" | "suspended" | "removed";
    }>(
      `SELECT status
       FROM integrations.github_installations
       WHERE organization_id = $1 AND github_installation_id = $2`,
      [organizationId, installationId]
    );
    const installationStatus = installation.rows[0]?.status;
    if (installationStatus === undefined || installationStatus === "removed") {
      return;
    }

    if (action === "added") {
      const targetStatus = installationStatus === "suspended" ? "suspended" : "active";
      for (const repository of added) {
        const inserted = await transaction.client.query<{ id: string }>(
          `INSERT INTO integrations.github_repositories (
             organization_id,
             github_installation_id,
             github_repository_id,
             full_name,
             status
           ) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (github_repository_id) DO NOTHING
           RETURNING id::text`,
          [
            organizationId,
            installationId,
            repository.githubRepositoryId,
            repository.fullName,
            targetStatus
          ]
        );
        if (inserted.rows[0] !== undefined) continue;

        const updated = await transaction.client.query<{ id: string }>(
          `UPDATE integrations.github_repositories
           SET full_name = $4, status = $5, updated_at = now()
           WHERE organization_id = $1
             AND github_installation_id = $2
             AND github_repository_id = $3
           RETURNING id::text`,
          [
            organizationId,
            installationId,
            repository.githubRepositoryId,
            repository.fullName,
            targetStatus
          ]
        );
        if (updated.rows[0] === undefined) {
          throw new RejectedLifecycleDeliveryError(
            "repository_ownership_conflict",
            "Repository identity is already owned by another integration mapping."
          );
        }
      }

      if (installationStatus === "active") {
        await transaction.client.query(
          `SELECT platform_internal.refresh_github_webhook_routes_for_installation($1, $2)`,
          [organizationId, installationId]
        );
      }
      return;
    }

    for (const repository of removed) {
      await transaction.client.query(
        `UPDATE integrations.github_repositories
         SET status = 'removed', updated_at = now()
         WHERE organization_id = $1
           AND github_installation_id = $2
           AND github_repository_id = $3
           AND status <> 'removed'`,
        [organizationId, installationId, repository.githubRepositoryId]
      );
    }
  }

  private async finish(
    transaction: DatabaseTransaction,
    inboxId: string,
    leaseToken: string,
    outcome: "blocked" | "retryable" | "completed" | "rejected" | "dead_letter",
    errorCode: string | null,
    availableAt: Date | null
  ): Promise<boolean> {
    const result = await transaction.client.query<{ finished: boolean }>(
      `SELECT platform_internal.finish_github_webhook_lifecycle(
         $1, $2, $3, $4, $5
       ) AS finished`,
      [inboxId, leaseToken, outcome, errorCode, availableAt]
    );
    return result.rows[0]?.finished === true;
  }
}
