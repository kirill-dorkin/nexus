import { describe, expect, it } from "vitest";

import {
  GRADER_MAX_FILE_BYTES,
  GraderProtocolError,
  buildGraderJobId,
  validateGraderJobRequest,
  type GraderJobRequest,
  type GraderJobSpec
} from "./protocol.js";

const submissionId = "01994fc0-8e4a-7f5c-8d26-dbe90af34001";
const activityVersionId = "01994fc0-8e4a-7f5c-8d26-dbe90af34002";

function spec(files: GraderJobSpec["source"]["files"]): GraderJobSpec {
  return {
    protocolVersion: 1,
    profile: { key: "typescript-tests", version: 1 },
    submissionId,
    activityVersionId,
    source: { files }
  };
}

function request(jobSpec: GraderJobSpec): GraderJobRequest {
  return { ...jobSpec, jobId: buildGraderJobId(jobSpec) };
}

describe("grader protocol v1", () => {
  it("derives a stable content-addressed identity independent of source file ordering", () => {
    const first = spec([
      { path: "src/index.ts", content: "export const value = 1;" },
      { path: "src/math.ts", content: "export const add = (a: number, b: number) => a + b;" }
    ]);
    const reordered = spec([...first.source.files].reverse());

    expect(buildGraderJobId(first)).toBe(buildGraderJobId(reordered));
    expect(() => validateGraderJobRequest(request(first))).not.toThrow();
  });

  it("rejects reuse of a job identity for materially different source", () => {
    const original = spec([{ path: "index.ts", content: "export const value = 1;" }]);
    const changed = spec([{ path: "index.ts", content: "export const value = 2;" }]);

    expect(() =>
      validateGraderJobRequest({ ...changed, jobId: buildGraderJobId(original) })
    ).toThrow(
      expect.objectContaining<Partial<GraderProtocolError>>({ code: "job_identity_mismatch" })
    );
  });

  it("rejects traversal, duplicate paths, and per-file transport overflow", () => {
    const cases = [
      request(spec([{ path: "../secret", content: "x" }])),
      request(
        spec([
          { path: "index.ts", content: "a" },
          { path: "index.ts", content: "b" }
        ])
      ),
      request(spec([{ path: "large.txt", content: "x".repeat(GRADER_MAX_FILE_BYTES + 1) }]))
    ];

    for (const candidate of cases) {
      expect(() => validateGraderJobRequest(candidate)).toThrow(GraderProtocolError);
    }
  });

  it("rejects a source bundle that exceeds the aggregate transport limit", () => {
    const candidate = request(
      spec(
        Array.from({ length: 5 }, (_, index) => ({
          path: `part-${index}.txt`,
          content: "x".repeat(220_000)
        }))
      )
    );

    expect(() => validateGraderJobRequest(candidate)).toThrow(
      expect.objectContaining<Partial<GraderProtocolError>>({ code: "source_bundle_too_large" })
    );
  });
});
