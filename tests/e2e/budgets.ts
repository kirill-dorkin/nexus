/*
 * Performance budgets per page, checked by specs/performance.spec.ts.
 * Script budgets are compressed JavaScript bytes, set about 15 % above the
 * measured size when they were introduced (2026-11-04). Raise one only with a
 * reason in the PR; lower it whenever a page gets lighter.
 */
const KB = 1024;

export const VITALS = {
  /** Core Web Vitals "good" thresholds. */
  lcpMs: 2500,
  cls: 0.1
} as const;

export const PAGES: readonly {
  path: string;
  name: string;
  scriptBudget: number;
  /** The only pages allowed to start the in-browser PostgreSQL engine. */
  sql?: true;
}[] = [
  { path: "/", name: "home", scriptBudget: 185 * KB },
  { path: "/courses", name: "catalog", scriptBudget: 185 * KB },
  { path: "/courses/e2e-html", name: "course", scriptBudget: 220 * KB },
  // Lessons were 275 KB. Since 2026-11-06 the course's character lives beside every lesson
  // (owner decision), and its 3D scene adds three.js (~110 KB) once it is on screen; the
  // measured 383 KB on a desktop viewport plus 15 % gives 440 KB. On phones the aside sits
  // below the lesson, so reading a lesson does not load it.
  {
    path: "/courses/e2e-html/first-tag",
    name: "lesson",
    scriptBudget: 440 * KB
  },
  {
    path: "/courses/e2e-html/query-preview",
    name: "SQL lesson",
    scriptBudget: 440 * KB,
    sql: true
  },
  { path: "/login", name: "sign-in", scriptBudget: 220 * KB },
  { path: "/me/learning", name: "my learning", scriptBudget: 220 * KB }
];
