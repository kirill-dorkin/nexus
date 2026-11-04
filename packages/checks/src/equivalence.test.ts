import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
import { afterAll, describe, expect, it } from "vitest";
import {
  isRunCheck,
  parseChallenge,
  runStaticChecks,
  staticPage,
  type Challenge,
  type ChallengeCheck,
  type CheckDocument
} from "./index";
import { parseHtmlOnServer } from "./server";

/*
 * Every HTML/CSS course challenge must get the same static results in the browser (happy-dom's
 * DOMParser, as the Web unit tests use) and on the server (parse5 + css-select): the solution
 * passes every static check in both, and the starting code gets the same result per check.
 */

type Manifest = {
  lessons: { slug: string; blocks: { markdown?: string }[] }[];
};

const window = new Window();
afterAll(() => window.happyDOM.close());
const parseInBrowser = (source: string) =>
  new window.DOMParser().parseFromString(
    source,
    "text/html"
  ) as unknown as CheckDocument;

/**
 * Where happy-dom does not follow the HTML parsing standard. The server agrees with Chrome
 * (checked with `DOMParser` in Chrome), so these are the browser test double's mistakes.
 */
const HAPPY_DOM_DEVIATIONS: {
  lesson: string;
  selector: string;
  why: string;
}[] = [
  {
    lesson: "code-quality",
    selector: "p ul",
    why: "a <ul> start tag closes an open <p>; happy-dom nests the list inside it"
  }
];
const deviates = (lesson: string, check: ChallengeCheck) =>
  HAPPY_DOM_DEVIATIONS.some(
    (d) => d.lesson === lesson && d.selector === check.selector
  );

const challenges = ["html", "css", "js"].flatMap((track) => {
  const manifest = JSON.parse(
    readFileSync(`docs/examples/${track}-track.manifest.json`, "utf8")
  ) as Manifest;
  return manifest.lessons.flatMap((lesson) =>
    lesson.blocks.flatMap((block) =>
      [
        ...(block.markdown ?? "").matchAll(/```challenge\n([\s\S]*?)\n```/g)
      ].flatMap((m) => {
        const challenge = parseChallenge(m[1] ?? "");
        // JS and SQL challenges are checked in sandboxes, not statically.
        return challenge && (challenge.lang ?? "html") === "html"
          ? [
              {
                name: `${track}/${lesson.slug}`,
                lesson: lesson.slug,
                challenge
              }
            ]
          : [];
      })
    )
  );
});

const results = (challenge: Challenge, code: string) => {
  const page = staticPage(challenge, code);
  return {
    browser: runStaticChecks(page, code, challenge.checks, parseInBrowser),
    server: runStaticChecks(page, code, challenge.checks, parseHtmlOnServer)
  };
};

describe("static checks in the browser and on the server", () => {
  it("covers the HTML and CSS courses", () => {
    expect(challenges.length).toBeGreaterThan(150);
  });

  it.each(challenges.map((c, i) => [`${c.name} #${i}`, c] as const))(
    "%s",
    (_, { lesson, challenge }) => {
      const staticOnly = challenge.checks.map((c) => !isRunCheck(c));
      const solution = results(challenge, challenge.solution ?? "");
      expect(
        solution.server.filter((ok, i) => staticOnly[i] && !ok),
        "the solution passes on the server"
      ).toEqual([]);
      expect(solution.server, "solution: same per check").toEqual(
        solution.browser
      );
      const start = results(challenge, challenge.start);
      challenge.checks.forEach((check, i) => {
        if (deviates(lesson, check)) return;
        expect(start.server[i], `start: ${check.label}`).toBe(start.browser[i]);
      });
    }
  );

  it("lists only deviations that still exist", () => {
    for (const d of HAPPY_DOM_DEVIATIONS) {
      const found = challenges.filter(
        (c) =>
          c.lesson === d.lesson &&
          c.challenge.checks.some((check) => check.selector === d.selector)
      );
      expect(found.length, d.lesson).toBeGreaterThan(0);
      const differs = found.some(({ challenge }) => {
        const { browser, server } = results(challenge, challenge.start);
        return browser.some((ok, i) => ok !== server[i]);
      });
      expect(differs, d.why).toBe(true);
    }
  });
});
