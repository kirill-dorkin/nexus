import { createHash } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable
} from "@nestjs/common";

import { DatabaseService } from "../../../database/database.service";
import { GitHubWebhookSignatureVerifier } from "../infrastructure/github-webhook-signature.verifier";
import { GitHubWebhookInboxRepository } from "./github-webhook-inbox.repository";

const supportedEvents = new Set([
  "ping",
  "installation",
  "installation_repositories",
  "pull_request",
  "pull_request_review",
  "check_run",
  "check_suite"
]);

const actionRequiredEvents = new Set([
  "installation",
  "installation_repositories",
  "pull_request",
  "pull_request_review",
  "check_run",
  "check_suite"
]);

const repositoryRequiredEvents = new Set([
  "pull_request",
  "pull_request_review",
  "check_run",
  "check_suite"
]);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const eventPattern = /^[a-z][a-z0-9_]{0,63}$/;
const actionPattern = /^[a-z][a-z0-9_]{0,99}$/;

type JsonObject = Readonly<Record<string, unknown>>;

export type ReceiveGitHubWebhookInput = Readonly<{
  rawBody: Buffer;
  signature: string | undefined;
  deliveryId: string | undefined;
  eventName: string | undefined;
  payload: unknown;
}>;

function requireObject(value: unknown, field: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${field} must be a JSON object.`);
  }
  return value as JsonObject;
}

function optionalExternalId(
  payload: JsonObject,
  field: "installation" | "repository"
): string | null {
  const container = payload[field];
  if (container === undefined || container === null) return null;

  const object = requireObject(container, `GitHub webhook ${field}`);
  const id = object.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new BadRequestException(
      `GitHub webhook ${field}.id must be a positive safe integer.`
    );
  }

  return String(id);
}

@Injectable()
export class GitHubWebhookApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly inbox: GitHubWebhookInboxRepository,
    private readonly signatures: GitHubWebhookSignatureVerifier
  ) {}

  async receive(input: ReceiveGitHubWebhookInput): Promise<void> {
    this.signatures.verify(input.rawBody, input.signature);

    const deliveryId = input.deliveryId;
    if (deliveryId === undefined || !uuidPattern.test(deliveryId)) {
      throw new BadRequestException("x-github-delivery must be a valid UUID.");
    }

    const eventName = input.eventName;
    if (
      eventName === undefined ||
      !eventPattern.test(eventName) ||
      !supportedEvents.has(eventName)
    ) {
      throw new BadRequestException("Unsupported GitHub webhook event.");
    }

    const payload = requireObject(input.payload, "GitHub webhook payload");
    const rawAction = payload.action;
    let action: string | null = null;

    if (actionRequiredEvents.has(eventName)) {
      if (typeof rawAction !== "string" || !actionPattern.test(rawAction)) {
        throw new BadRequestException(
          "GitHub webhook action is required for this event."
        );
      }
      action = rawAction;
    } else if (rawAction !== undefined && rawAction !== null) {
      if (typeof rawAction !== "string" || !actionPattern.test(rawAction)) {
        throw new BadRequestException("Invalid GitHub webhook action.");
      }
      action = rawAction;
    }

    const githubInstallationId = optionalExternalId(payload, "installation");
    const githubRepositoryId = optionalExternalId(payload, "repository");

    if (eventName !== "ping" && githubInstallationId === null) {
      throw new BadRequestException(
        "GitHub webhook installation.id is required for this event."
      );
    }
    if (
      repositoryRequiredEvents.has(eventName) &&
      githubRepositoryId === null
    ) {
      throw new BadRequestException(
        "GitHub webhook repository.id is required for this event."
      );
    }
    if (
      eventName === "ping" &&
      (githubInstallationId !== null || githubRepositoryId !== null)
    ) {
      throw new BadRequestException(
        "GitHub ping webhook must not carry tenant routing identifiers."
      );
    }

    const payloadSha256 = createHash("sha256")
      .update(input.rawBody)
      .digest("hex");
    const accepted = await this.database.transaction((transaction) =>
      this.inbox.accept(transaction, {
        deliveryId,
        eventName,
        action,
        githubInstallationId,
        githubRepositoryId,
        payloadSha256,
        payload
      })
    );

    if (
      !accepted.inserted &&
      accepted.existingPayloadSha256 !== payloadSha256
    ) {
      throw new ConflictException(
        "GitHub delivery id was already accepted with different content."
      );
    }
  }
}
