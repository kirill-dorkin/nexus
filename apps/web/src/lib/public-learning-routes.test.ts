import { brand } from "@platform/brand";
import { describe, expect, it } from "vitest";

import {
  HOME_ORGANIZATION_SLUG,
  courseUrl,
  organizationName
} from "./public-learning-routes";

describe("public learning routes", () => {
  it("names the home organization after the site", () => {
    expect(
      organizationName({ slug: HOME_ORGANIZATION_SLUG, name: "Old name" })
    ).toBe(brand.name);
    expect(organizationName({ slug: "partner", name: "Partner School" })).toBe(
      "Partner School"
    );
  });

  it("gives home courses the short address", () => {
    const address = {
      organization: { slug: HOME_ORGANIZATION_SLUG },
      offering: { slug: "html-v2" },
      course: { slug: "html" }
    };
    expect(courseUrl(address)).toBe("/courses/html");
    expect(courseUrl({ ...address, organization: { slug: "partner" } })).toBe(
      "/learn/partner/html-v2"
    );
  });
});
