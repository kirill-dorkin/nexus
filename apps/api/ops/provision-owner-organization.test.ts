import { describe, expect, it } from "vitest";
import { parseOwnerProvisionArgs } from "./provision-owner-organization";

const userId = "11111111-1111-4111-8111-111111111111";
const flags = [
  "--owner-user-id",
  userId,
  "--slug",
  "operator-academy",
  "--name",
  "Operator Academy",
  "--apply"
];

describe("trusted owner-organization CLI arguments", () => {
  it("requires explicit apply and one authenticated Identity locator", () => {
    expect(parseOwnerProvisionArgs(flags)).toEqual({
      ownerUserId: userId,
      slug: "operator-academy",
      name: "Operator Academy"
    });
    expect(() => parseOwnerProvisionArgs(flags.slice(0, -1))).toThrow();
    expect(() => parseOwnerProvisionArgs([...flags, "--apply"])).toThrow();
    expect(() =>
      parseOwnerProvisionArgs([...flags, "--owner-user-id", userId])
    ).toThrow();
  });

  it("rejects malformed UUID, extra flags, and invalid Organization data", () => {
    expect(() =>
      parseOwnerProvisionArgs(
        flags.map((value) =>
          value === userId ? "someone@example.test" : value
        )
      )
    ).toThrow();
    expect(() =>
      parseOwnerProvisionArgs([...flags, "--unsafe", "yes"])
    ).toThrow();
    expect(() =>
      parseOwnerProvisionArgs(
        flags.map((value) =>
          value === "operator-academy" ? "Unsafe Slug" : value
        )
      )
    ).toThrow();
    expect(() =>
      parseOwnerProvisionArgs(
        flags.map((value) => (value === "Operator Academy" ? "" : value))
      )
    ).toThrow();
  });
});
