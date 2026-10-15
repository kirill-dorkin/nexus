/**
 * These are navigation affordances, never an authorization decision.
 * Studio, Teaching and Organization must be exposed only by a separate
 * server-authorized staff workspace discovery contract.
 */
export const publicDestinations = [
  { href: "/courses", label: "Курсы" },
  { href: "/blog", label: "Блог" }
] as const;

export const learnerDestinations = [
  { href: "/me/learning", label: "Моё обучение" }
] as const;
