import type { WebRoute } from "@platform/contracts";

// Most specific first. Each pattern reports its template, never the address.
const ROUTES: readonly [RegExp, WebRoute][] = [
  [/^\/$/, "/"],
  [/^\/blog\/?$/, "/blog"],
  [/^\/blog\/[^/]+\/?$/, "/blog/[slug]"],
  [
    /^\/catalog\/[^/]+\/products\/[^/]+\/?$/,
    "/catalog/[organization]/products/[product]"
  ],
  [/^\/checkout\/paddle\/[^/]+\/?$/, "/checkout/paddle/[purchase]"],
  [/^\/courses\/?$/, "/courses"],
  [/^\/courses\/[^/]+\/?$/, "/courses/[course]"],
  [/^\/courses\/[^/]+\/[^/]+\/?$/, "/courses/[course]/[lesson]"],
  [/^\/learn\/[^/]+\/[^/]+\/?$/, "/learn/[organization]/[offering]"],
  [
    /^\/learn\/[^/]+\/[^/]+\/[^/]+\/?$/,
    "/learn/[organization]/[offering]/[lesson]"
  ],
  [/^\/login\/?$/, "/login"],
  [/^\/forgot-password\/?$/, "/forgot-password"],
  [/^\/reset-password\/?$/, "/reset-password"],
  [/^\/me\/learning\/?$/, "/me/learning"],
  [/^\/purchases\/[^/]+\/?$/, "/purchases/[purchase]"],
  [/^\/studio\/?$/, "/studio"],
  [/^\/studio\/[^/]+\/entry-policy\/?$/, "/studio/[organization]/entry-policy"],
  [
    /^\/studio\/[^/]+\/[^/]+\/offerings\/?$/,
    "/studio/[organization]/[course]/offerings"
  ],
  [/^\/studio\/[^/]+\/[^/]+\/?$/, "/studio/[organization]/[course]"],
  [/^\/ui\/?$/, "/ui"]
];

/** The route template of a pathname, so telemetry never carries slugs or ids. */
export function routeTemplate(pathname: string): WebRoute {
  for (const [pattern, route] of ROUTES)
    if (pattern.test(pathname)) return route;
  return "other";
}
