import { describe, expect, it } from "vitest";

import { oneRow } from "./one-row";

describe("oneRow", () => {
  it("returns the first row", () => {
    expect(oneRow({ rows: [{ id: "a" }, { id: "b" }] }, "the test row")).toEqual({ id: "a" });
  });

  it("throws a descriptive error when the statement returned nothing", () => {
    expect(() => oneRow({ rows: [] }, "the created activity")).toThrow(
      "PostgreSQL returned no row for the created activity."
    );
  });
});
