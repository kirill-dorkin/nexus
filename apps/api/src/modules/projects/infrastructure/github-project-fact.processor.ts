import { randomUUID } from "node:crypto";

import {
  withTransaction,
  type DatabasePool
} from "@platform/database";

import {
  GitHubProjectFactDeliveryRepository,
  type GitHubProjectFactDeliveryClaim
} from "../../integrations/application/github-project-fact-delivery.repository";
import { GitHubProjectFactsRepository } from "../application/github-project-facts.repository";
import {
  normalizeGitHubProjectFact,
  RejectedGitHubProjectFactDeliveryError
} from "./github-project-fact.normalizer";

export type GitHubProjectFactProcessorOptions = Readonly<{
  leaseSeconds?: number;
  maxAttempts?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
}>;

export class GitHubProjectFactProcessor {
  private readonly leaseSeconds: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;

  constructor(
    private readonly pool: DatabasePool,
    private readonly deliveries: GitHubProjectFactDeliveryRepository,
    private readonly facts: GitHubProjectFactsRepository,
    options: GitHubProjectFactProcessorOptions = {}
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
    const claim = await withTransaction(this.pool, (transaction) =>
      this.deliveries.claim(transaction, {
        leaseToken,
        leaseSeconds: this.leaseSeconds
      })
    );
    if (claim === null) return false;

    if (
      claim.routingStatus === "unmapped_installation" ||
      claim.routingStatus === "unmapped_repository"
    ) {
      await this.finish(claim, leaseToken, "blocked", claim.routingStatus, null);
      return true;
    }

    const organizationId = claim.organizationId;
    if (claim.routingStatus !== "mapped" || organizationId === null) {
      await this.finish(claim, leaseToken, "rejected", "routing_rejected", null);
      return true;
    }

    const githubRepositoryMappingId = claim.githubRepositoryMappingId;
    if (
      githubRepositoryMappingId === null ||
      claim.githubRepositoryId === null ||
      claim.githubInstallationId === null
    ) {
      await this.finish(
        claim,
        leaseToken,
        "rejected",
        "trusted_repository_identity_missing",
        null
      );
      return true;
    }

    try {
      await withTransaction(this.pool, async (transaction) => {
        await transaction.client.query("SELECT set_config('app.organization_id', $1, true)", [
          organizationId
        ]);

        const binding = await this.facts.resolveRepositoryBindingAt(transaction, {
          organizationId,
          githubRepositoryMappingId,
          sourceReceivedAt: claim.sourceReceivedAt
        });
        if (binding === null) {
          throw new RejectedGitHubProjectFactDeliveryError(
            "repository_not_bound_at_receive_time",
            "Repository was not bound to a Project when the delivery was accepted."
          );
        }

        await this.facts.record(
          transaction,
          normalizeGitHubProjectFact(claim, binding)
        );

        const finished = await this.deliveries.finish(transaction, {
          inboxId: claim.inboxId,
          leaseToken,
          outcome: "completed",
          errorCode: null,
          availableAt: null
        });
        if (!finished) throw new Error("GitHub Project-fact processing lease was lost.");
      });
    } catch (error) {
      if (error instanceof RejectedGitHubProjectFactDeliveryError) {
        await this.finish(claim, leaseToken, "rejected", error.code, null);
        return true;
      }

      const nextFailureCount = claim.failureCount + 1;
      const terminal = nextFailureCount >= this.maxAttempts;
      const delay = Math.min(
        this.retryMaxMs,
        this.retryBaseMs * 2 ** Math.max(0, Math.min(nextFailureCount - 1, 10))
      );
      await this.finish(
        claim,
        leaseToken,
        terminal ? "dead_letter" : "retryable",
        "processor_failure",
        terminal ? null : new Date(Date.now() + delay)
      );
    }

    return true;
  }

  private async finish(
    claim: GitHubProjectFactDeliveryClaim,
    leaseToken: string,
    outcome: "blocked" | "retryable" | "completed" | "rejected" | "dead_letter",
    errorCode: string | null,
    availableAt: Date | null
  ): Promise<void> {
    await withTransaction(this.pool, (transaction) =>
      this.deliveries.finish(transaction, {
        inboxId: claim.inboxId,
        leaseToken,
        outcome,
        errorCode,
        availableAt
      })
    );
  }
}
