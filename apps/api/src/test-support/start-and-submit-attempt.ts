import type { NestFastifyApplication } from "@nestjs/platform-fastify";

type InjectResult = Awaited<ReturnType<NestFastifyApplication["inject"]>>;

const submissionByAttempt = new Map<string, string>();

/**
 * Starts an Attempt and submits learner work for it through the canonical
 * routes (ADR-0018): POST …/attempts with an empty body, then
 * POST …/attempts/:id/submissions. Returns the Attempt response.
 */
export async function startAndSubmitAttempt(
  app: NestFastifyApplication,
  request: {
    url: string;
    headers: Record<string, string>;
    submission: Record<string, unknown>;
  }
): Promise<InjectResult> {
  const started = await app.inject({
    method: "POST",
    url: request.url,
    headers: request.headers,
    payload: {}
  });
  if (started.statusCode !== 201) return started;
  const attemptId = (JSON.parse(started.body) as { id: string }).id;
  const organizationPath = request.url.split("/enrollments/")[0];
  const submitted = await app.inject({
    method: "POST",
    url: `${organizationPath}/attempts/${attemptId}/submissions`,
    headers: request.headers,
    payload: { payload: request.submission }
  });
  if (submitted.statusCode !== 201)
    throw new Error(
      `Submission failed with ${String(submitted.statusCode)}: ${submitted.body}`
    );
  submissionByAttempt.set(
    attemptId,
    (JSON.parse(submitted.body) as { id: string }).id
  );
  return started;
}

/** The Evidence route of the Submission that startAndSubmitAttempt made for this Attempt. */
export function evidenceUrlForAttempt(
  organizationId: string,
  attemptId: string
): string {
  const submissionId = submissionByAttempt.get(attemptId);
  if (submissionId === undefined)
    throw new Error(`No submission recorded for attempt ${attemptId}.`);
  return `/v1/organizations/${organizationId}/submissions/${submissionId}/evidence`;
}
