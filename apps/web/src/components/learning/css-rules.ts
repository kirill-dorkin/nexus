import { itemAt } from "../../lib/item-at";
/**
 * Minimal CSS reader for hands-on CSS challenges: finds which declarations a learner wrote for
 * which selector, inside which at-rule context. It is deliberately static (no layout engine), so
 * checks behave the same in the browser and in Node tests. Never executes anything.
 */

export type CssRule = {
  /** Normalized selectors of the rule (comma-separated list split). */
  selectors: string[];
  /** Normalized preludes of enclosing at-rules, outermost first: "@media (min-width:600px)". */
  context: string[];
  /** property → normalized value (last declaration wins). */
  declarations: Map<string, string>;
};

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

export function normalizeSelector(selector: string): string {
  return collapse(selector.toLowerCase())
    .replace(/\s*([>+~,])\s*/g, "$1")
    .replace(/\(\s*/g, "(")
    .replace(/\s*\)/g, ")");
}

export function normalizeValue(value: string): string {
  return collapse(value.toLowerCase().replace(/!important\s*$/, ""))
    .replace(/\s*,\s*/g, ",")
    .replace(/\(\s*/g, "(")
    .replace(/\s*\)/g, ")")
    .replace(/\s*\/\s*/g, "/");
}

function normalizePrelude(prelude: string): string {
  return collapse(prelude.toLowerCase())
    .replace(/\s*:\s*/g, ":")
    .replace(/\(\s*/g, "(")
    .replace(/\s*\)/g, ")");
}

/** Split on a separator that is not inside (), [] or quotes. */
function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = itemAt(text, i);
    if (quote) {
      if (ch === quote && text[i - 1] !== "\\") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === separator && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** Index of the brace that closes the one at `open`, respecting quotes. */
function matchBrace(text: string, open: number): number {
  let depth = 0;
  let quote = "";
  for (let i = open; i < text.length; i++) {
    const ch = itemAt(text, i);
    if (quote) {
      if (ch === quote && text[i - 1] !== "\\") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return text.length;
}

const GROUPING =
  /^@(media|container|supports|layer|scope|keyframes|starting-style|document)\b/;

function resolveNested(parents: string[], child: string): string[] {
  if (!parents.length) return [child];
  return parents.map((parent) =>
    child.includes("&") ? child.replace(/&/g, parent) : `${parent} ${child}`
  );
}

function parseBlock(
  text: string,
  parents: string[],
  context: string[],
  rules: CssRule[]
) {
  let declarations = "";
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    const semicolonEnd = (() => {
      // A declaration that ends before the next block belongs to the current rule.
      const head = open < 0 ? text.slice(i) : text.slice(i, open);
      const last = head.lastIndexOf(";");
      return last < 0 ? -1 : i + last;
    })();
    if (open < 0) {
      declarations += text.slice(i);
      break;
    }
    if (semicolonEnd >= 0) {
      declarations += text.slice(i, semicolonEnd + 1);
      i = semicolonEnd + 1;
    }
    const prelude = text.slice(i, open).trim();
    const close = matchBrace(text, open);
    const body = text.slice(open + 1, close);
    if (prelude.startsWith("@")) {
      if (GROUPING.test(prelude))
        parseBlock(
          body,
          prelude.startsWith("@keyframes") ? [] : parents,
          [...context, normalizePrelude(prelude)],
          rules
        );
      else if (
        /^@(font-face|page|property|counter-style|font-palette-values)\b/.test(
          prelude
        )
      )
        parseBlock(body, [normalizePrelude(prelude)], context, rules);
    } else if (prelude) {
      const own = splitTop(prelude, ",")
        .map((s) => s.trim())
        .filter(Boolean);
      const selectors = own
        .flatMap((s) => resolveNested(parents, s))
        .map(normalizeSelector);
      parseBlock(body, selectors, context, rules);
    }
    i = close + 1;
  }
  if (parents.length && declarations.trim()) {
    const map = new Map<string, string>();
    for (const part of splitTop(declarations, ";")) {
      const colon = part.indexOf(":");
      if (colon < 0) continue;
      const property = part.slice(0, colon).trim().toLowerCase();
      const value = part.slice(colon + 1).trim();
      if (property && value) map.set(property, normalizeValue(value));
    }
    if (map.size)
      rules.push({ selectors: parents, context, declarations: map });
  }
}

/** All style rules from `<style>` elements and bare CSS text. */
export function readCss(source: string): CssRule[] {
  const sheets = [
    ...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)
  ].map((m) => itemAt(m, 1));
  const css = (
    sheets.length ? sheets.join("\n") : /<[a-z!]/i.test(source) ? "" : source
  ).replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  parseBlock(css, [], [], rules);
  return rules;
}

export type CssCheck = {
  selector: string;
  property: string;
  /** Accepted values (normalized comparison). Omit to require only that the property is set. */
  value?: string | string[];
  /** Value must contain this fragment instead (e.g. "minmax(" or "ease"). */
  includes?: string;
  /** An enclosing at-rule prelude must contain this (e.g. "@media", "min-width", "@container"). */
  within?: string;
};

export function cssMatches(rules: CssRule[], check: CssCheck): boolean {
  const selector = normalizeSelector(check.selector);
  const property = check.property.toLowerCase();
  const accepted =
    check.value === undefined ? null : [check.value].flat().map(normalizeValue);
  const within = check.within ? normalizePrelude(check.within) : null;
  return rules.some((rule) => {
    if (!rule.selectors.includes(selector)) return false;
    if (within && !rule.context.some((c) => c.includes(within))) return false;
    const value = rule.declarations.get(property);
    if (value === undefined) return false;
    if (accepted && !accepted.includes(value)) return false;
    if (check.includes && !value.includes(normalizeValue(check.includes)))
      return false;
    return true;
  });
}
