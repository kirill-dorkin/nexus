/*
 * What pages need to know about the 3D characters without loading three.js: which slugs have a
 * body and each one's page colours (action, light, deep, background). The bodies themselves
 * live in the lazily loaded three.js chunk (roster.ts).
 */
export const BODY_UI = {
  pc: ["#38e1ff", "#a5f3fc", "#0e7490", "#083344"],
  browser: ["#5aa9ff", "#bfdbfe", "#1e3a8a", "#0b1a3a"],
  html: ["#f26a21", "#ffa15c", "#d9441c", "#3a1208"],
  css: ["#a78bfa", "#ddd6fe", "#6d28d9", "#2e1065"],
  js: ["#f7df1e", "#fef9c3", "#a16207", "#3f2f00"],
  sql: ["#2dd4bf", "#99f6e4", "#0f766e", "#042f2e"],
  terminal: ["#39ff6a", "#b6ffc8", "#15803d", "#052e16"]
} as const satisfies Record<string, readonly [string, string, string, string]>;

export type BodySlug = keyof typeof BODY_UI;

export const hasBody = (slug: string): slug is BodySlug =>
  Object.hasOwn(BODY_UI, slug);
