import { courseManifestV1Schema, studioDraftSchema } from "@platform/contracts";
import { describe, expect, it } from "vitest";

import { manifest, studioDraft } from "./fixtures";

describe("test fixtures", () => {
  it("are valid contract data", () => {
    expect(courseManifestV1Schema.safeParse(manifest()).success).toBe(true);
    expect(studioDraftSchema.safeParse(studioDraft()).success).toBe(true);
  });
});
