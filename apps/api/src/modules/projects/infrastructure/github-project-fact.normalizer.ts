import type { GitHubProjectFactDeliveryClaim } from "../../integrations/application/github-project-fact-delivery.port";
import type {
  NormalizedGitHubProjectFact,
  ProjectRepositoryBindingAt
} from "../application/github-project-facts.repository";

type JsonObject = Readonly<Record<string, unknown>>;
type ExternalUser = Readonly<{ id: string | null; login: string | null }>;

export class RejectedGitHubProjectFactDeliveryError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "RejectedGitHubProjectFactDeliveryError";
  }
}

function object(value: unknown, field: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} must be an object.`
    );
  }
  return value as JsonObject;
}

function externalId(value: unknown, field: string): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} must be a positive safe integer.`
    );
  }
  return String(value);
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} must be a positive safe integer.`
    );
  }
  return value;
}

function requiredString(
  value: unknown,
  field: string,
  maxLength = 255
): string {
  if (typeof value !== "string") {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} must be a string.`
    );
  }
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > maxLength) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} is invalid.`
    );
  }
  return normalized;
}

function optionalString(
  value: unknown,
  field: string,
  maxLength = 255
): string | null {
  if (value === null || value === undefined) return null;
  return requiredString(value, field, maxLength);
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} must be a boolean.`
    );
  }
  return value;
}

function gitSha(value: unknown, field: string): string {
  const normalized = requiredString(value, field, 64).toLowerCase();
  if (!/^[0-9a-f]{40,64}$/.test(normalized)) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} must be a Git object SHA.`
    );
  }
  return normalized;
}

function timestamp(value: unknown, field: string): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} must be an ISO timestamp.`
    );
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} must be an ISO timestamp.`
    );
  }
  return parsed;
}

function requiredTimestamp(value: unknown, field: string): Date {
  const parsed = timestamp(value, field);
  if (parsed === null) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      `${field} is required.`
    );
  }
  return parsed;
}

function user(value: unknown, field: string): ExternalUser {
  if (value === null || value === undefined) return { id: null, login: null };
  const record = object(value, field);
  return {
    id: externalId(record.id, `${field}.id`),
    login: requiredString(record.login, `${field}.login`)
  };
}

function optionalAppId(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return externalId(object(value, field).id, `${field}.id`);
}

function validateRoutingIdentity(
  payload: JsonObject,
  installationId: string,
  repositoryId: string
): void {
  const payloadInstallationId = externalId(
    object(payload.installation, "payload.installation").id,
    "payload.installation.id"
  );
  const payloadRepositoryId = externalId(
    object(payload.repository, "payload.repository").id,
    "payload.repository.id"
  );
  if (
    payloadInstallationId !== installationId ||
    payloadRepositoryId !== repositoryId
  ) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "routing_identity_mismatch",
      "Payload repository identity differs from the trusted inbox identity."
    );
  }
}

export function normalizeGitHubProjectFact(
  claim: GitHubProjectFactDeliveryClaim,
  binding: ProjectRepositoryBindingAt
): NormalizedGitHubProjectFact {
  if (
    claim.organizationId === null ||
    claim.githubRepositoryMappingId === null ||
    claim.githubRepositoryId === null ||
    claim.githubInstallationId === null
  ) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "trusted_repository_identity_missing",
      "Trusted repository identity is incomplete."
    );
  }
  if (claim.action === null) {
    throw new RejectedGitHubProjectFactDeliveryError(
      "invalid_payload",
      "Project activity action is required."
    );
  }

  const payload = object(claim.payload, "payload");
  validateRoutingIdentity(
    payload,
    claim.githubInstallationId,
    claim.githubRepositoryId
  );
  const sender = user(payload.sender, "payload.sender");
  const common = {
    organizationId: claim.organizationId,
    projectId: binding.projectId,
    repositoryBindingId: binding.repositoryBindingId,
    githubRepositoryMappingId: claim.githubRepositoryMappingId,
    sourceInboxId: claim.inboxId,
    sourceDeliveryId: claim.deliveryId,
    sourcePayloadSha256: claim.payloadSha256,
    action: claim.action,
    githubRepositoryId: claim.githubRepositoryId,
    githubSenderUserId: sender.id,
    githubSenderUserLogin: sender.login,
    sourceReceivedAt: claim.sourceReceivedAt
  } as const;

  if (claim.eventName === "pull_request") {
    const pullRequest = object(payload.pull_request, "payload.pull_request");
    const pullRequestId = externalId(pullRequest.id, "payload.pull_request.id");
    const subject = user(pullRequest.user, "payload.pull_request.user");
    const head = object(pullRequest.head, "payload.pull_request.head");
    return {
      ...common,
      factType: "pull_request",
      githubObjectId: pullRequestId,
      githubPullRequestId: pullRequestId,
      githubPullRequestNumber: positiveInteger(
        pullRequest.number,
        "payload.pull_request.number"
      ),
      githubSubjectUserId: subject.id,
      githubSubjectUserLogin: subject.login,
      githubAppId: null,
      name: null,
      state: requiredString(
        pullRequest.state,
        "payload.pull_request.state",
        100
      ),
      status: null,
      conclusion: null,
      headSha: gitSha(head.sha, "payload.pull_request.head.sha"),
      commitSha: null,
      isDraft: booleanValue(pullRequest.draft, "payload.pull_request.draft"),
      isMerged: booleanValue(pullRequest.merged, "payload.pull_request.merged"),
      providerCreatedAt: requiredTimestamp(
        pullRequest.created_at,
        "payload.pull_request.created_at"
      ),
      providerUpdatedAt: requiredTimestamp(
        pullRequest.updated_at,
        "payload.pull_request.updated_at"
      ),
      providerSubmittedAt: null,
      providerStartedAt: null,
      providerCompletedAt: null
    };
  }

  if (claim.eventName === "pull_request_review") {
    const pullRequest = object(payload.pull_request, "payload.pull_request");
    const review = object(payload.review, "payload.review");
    const subject = user(review.user, "payload.review.user");
    return {
      ...common,
      factType: "pull_request_review",
      githubObjectId: externalId(review.id, "payload.review.id"),
      githubPullRequestId: externalId(
        pullRequest.id,
        "payload.pull_request.id"
      ),
      githubPullRequestNumber: positiveInteger(
        pullRequest.number,
        "payload.pull_request.number"
      ),
      githubSubjectUserId: subject.id,
      githubSubjectUserLogin: subject.login,
      githubAppId: null,
      name: null,
      state: requiredString(review.state, "payload.review.state", 100),
      status: null,
      conclusion: null,
      headSha: null,
      commitSha: gitSha(review.commit_id, "payload.review.commit_id"),
      isDraft: null,
      isMerged: null,
      providerCreatedAt: null,
      providerUpdatedAt: null,
      providerSubmittedAt: timestamp(
        review.submitted_at,
        "payload.review.submitted_at"
      ),
      providerStartedAt: null,
      providerCompletedAt: null
    };
  }

  if (claim.eventName === "check_run") {
    const checkRun = object(payload.check_run, "payload.check_run");
    return {
      ...common,
      factType: "check_run",
      githubObjectId: externalId(checkRun.id, "payload.check_run.id"),
      githubPullRequestId: null,
      githubPullRequestNumber: null,
      githubSubjectUserId: null,
      githubSubjectUserLogin: null,
      githubAppId: optionalAppId(checkRun.app, "payload.check_run.app"),
      name: requiredString(checkRun.name, "payload.check_run.name"),
      state: null,
      status: requiredString(checkRun.status, "payload.check_run.status", 100),
      conclusion: optionalString(
        checkRun.conclusion,
        "payload.check_run.conclusion",
        100
      ),
      headSha: gitSha(checkRun.head_sha, "payload.check_run.head_sha"),
      commitSha: null,
      isDraft: null,
      isMerged: null,
      providerCreatedAt: null,
      providerUpdatedAt: null,
      providerSubmittedAt: null,
      providerStartedAt: timestamp(
        checkRun.started_at,
        "payload.check_run.started_at"
      ),
      providerCompletedAt: timestamp(
        checkRun.completed_at,
        "payload.check_run.completed_at"
      )
    };
  }

  const checkSuite = object(payload.check_suite, "payload.check_suite");
  return {
    ...common,
    factType: "check_suite",
    githubObjectId: externalId(checkSuite.id, "payload.check_suite.id"),
    githubPullRequestId: null,
    githubPullRequestNumber: null,
    githubSubjectUserId: null,
    githubSubjectUserLogin: null,
    githubAppId: optionalAppId(checkSuite.app, "payload.check_suite.app"),
    name: null,
    state: null,
    status: requiredString(
      checkSuite.status,
      "payload.check_suite.status",
      100
    ),
    conclusion: optionalString(
      checkSuite.conclusion,
      "payload.check_suite.conclusion",
      100
    ),
    headSha: gitSha(checkSuite.head_sha, "payload.check_suite.head_sha"),
    commitSha: null,
    isDraft: null,
    isMerged: null,
    providerCreatedAt: timestamp(
      checkSuite.created_at,
      "payload.check_suite.created_at"
    ),
    providerUpdatedAt: timestamp(
      checkSuite.updated_at,
      "payload.check_suite.updated_at"
    ),
    providerSubmittedAt: null,
    providerStartedAt: null,
    providerCompletedAt: null
  };
}
