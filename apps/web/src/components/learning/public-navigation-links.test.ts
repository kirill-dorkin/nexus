import { describe, expect, it } from "vitest";
import { learnerDestinations, publicDestinations } from "./public-navigation-links";

describe("public/learner navigation boundary", () => {
  it("keeps only product discovery in the global navigation", () => {
    expect(publicDestinations.map((item) => item.href)).toEqual(["/courses", "/blog"]);
  });

  it("does not expose staff routes on the basis of an authenticated session", () => {
    const links = [...publicDestinations, ...learnerDestinations].map((item) => item.href);
    expect(links).toContain("/me/learning");
    expect(links).not.toContain("/studio");
    expect(links.some((href) => href.startsWith("/org/") || href.startsWith("/teach/"))).toBe(false);
  });
});
