import { isRunCheck, isSqlCheck, type ChallengeCheck } from "./challenge";
import { cssMatches, readCss, type CssRule } from "./css-rules";

/**
 * The part of a parsed document the static checks read. The browser passes a `DOMParser`
 * document; the server passes the adapter from `@platform/checks/server`. Nothing here touches
 * browser globals, and nothing executes the learner's code.
 */
export type CheckElement = {
  readonly textContent: string | null;
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string | null;
};
export type CheckDocument = {
  /** Throws on a selector it cannot parse, like `Document.querySelectorAll`. */
  querySelectorAll(selector: string): ArrayLike<CheckElement>;
};
export type ParseHtml = (source: string) => CheckDocument;

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Evaluates the static checks against the learner's code and its parsed page.
 * Runnable checks (`js`, `log`) and SQL checks report false here; their results come from the
 * browser sandbox and the SQL engine.
 */
export function runChecks(
  code: string,
  checks: readonly ChallengeCheck[],
  doc: CheckDocument
): boolean[] {
  const source = code.toLowerCase();
  let rules: CssRule[] | null = null;
  return checks.map((check) => {
    if (isRunCheck(check) || isSqlCheck(check)) return false;
    if (check.css !== undefined) {
      rules ??= readCss(code);
      const found = cssMatches(rules, check.css);
      return check.absent ? !found : found;
    }
    if (check.contains !== undefined) {
      const found = source.includes(check.contains.toLowerCase());
      return check.absent ? !found : found;
    }
    if (check.selector === undefined) return false;
    let found: CheckElement[];
    try {
      found = Array.from(doc.querySelectorAll(check.selector));
    } catch {
      return false;
    }
    found = found.filter(
      (el) =>
        (check.text === undefined ||
          norm(el.textContent ?? "").includes(norm(check.text))) &&
        (check.attr === undefined ||
          (el.hasAttribute(check.attr) &&
            (check.value === undefined ||
              (el.getAttribute(check.attr) ?? "").trim() === check.value)))
    );
    if (check.absent) return found.length === 0;
    if (check.max !== undefined)
      return found.length <= check.max && found.length >= (check.count ?? 0);
    return found.length >= (check.count ?? 1);
  });
}

/** Parses the page only when a selector check needs it. */
export function runStaticChecks(
  page: string,
  code: string,
  checks: readonly ChallengeCheck[],
  parseHtml: ParseHtml
): boolean[] {
  const needsDom = checks.some(
    (c) => c.selector !== undefined && !isRunCheck(c) && !isSqlCheck(c)
  );
  return runChecks(
    code,
    checks,
    needsDom ? parseHtml(page) : { querySelectorAll: () => [] }
  );
}
