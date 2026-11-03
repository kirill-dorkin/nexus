import { describe, expect, it } from "vitest";
import { orderByRoute, routePosition } from "./learning-route";
import { HOME_ORGANIZATION_SLUG } from "./public-learning-routes";

const home = (slug: string) => ({
  organization: { slug: HOME_ORGANIZATION_SLUG },
  offering: { slug: `${slug}-v9` },
  course: { slug }
});
const other = (slug: string) => ({
  organization: { slug: "elsewhere" },
  offering: { slug },
  course: { slug }
});

describe("learning route", () => {
  it("orders the catalog by the route, whatever order the API returns", () => {
    const catalog = [
      other("aaa"),
      home("css"),
      home("sql"),
      home("html"),
      home("misc"),
      home("js")
    ];
    expect(orderByRoute(catalog).map((c) => c.course.slug)).toEqual([
      "html",
      "css",
      "js",
      "sql",
      "aaa",
      "misc"
    ]);
  });

  it("links neighbours and counts only published steps", () => {
    const catalog = [home("html"), home("js"), home("sql")];
    const js = routePosition(home("js"), catalog)!;
    expect(js.number).toBe(2);
    expect(js.total).toBe(3);
    expect(js.previous?.course.course.slug).toBe("html");
    expect(js.next?.course.course.slug).toBe("sql");
    expect(routePosition(home("sql"), catalog)!.next).toBeNull();
    expect(routePosition(home("html"), catalog)!.previous).toBeNull();
  });

  it("ignores courses outside the route and other organizations' courses with the same slug", () => {
    expect(
      routePosition(home("misc"), [home("html"), home("misc")])
    ).toBeNull();
    expect(routePosition(other("html"), [other("html")])).toBeNull();
    expect(
      routePosition(home("css"), [other("html"), home("css")])!.previous
    ).toBeNull();
  });
});
