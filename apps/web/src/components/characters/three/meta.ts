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
  terminal: ["#39ff6a", "#b6ffc8", "#15803d", "#052e16"],
  git: ["#f05032", "#ffb199", "#9a2c16", "#2a0d06"],
  ts: ["#3178c6", "#b3d4ff", "#1e3a8a", "#0a1830"],
  node: ["#5fa04e", "#c7f2a8", "#2f6b22", "#0d1f0a"],
  react: ["#61dafb", "#c4f4ff", "#0e7490", "#06202a"],
  network: ["#818cf8", "#d6d9ff", "#3730a3", "#0e0f2e"],
  python: ["#ffd43b", "#fff3b0", "#2b5b8c", "#0b1a2b"],
  docker: ["#2496ed", "#bfe3ff", "#1d4f91", "#071a33"],
  next: ["#f5f5f5", "#ffffff", "#3f3f46", "#0a0a0c"],
  go: ["#00add8", "#b8f1ff", "#0f6f86", "#04212a"],
  os: ["#f59e0b", "#ffe2a8", "#4a4038", "#1c1712"]
} as const satisfies Record<string, readonly [string, string, string, string]>;

export type BodySlug = keyof typeof BODY_UI;

export const hasBody = (slug: string): slug is BodySlug =>
  Object.hasOwn(BODY_UI, slug);
