// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import {
  isRunCheck,
  isRunnable,
  isSqlCheck,
  parseChallenge,
  runChecks,
  sqlJob,
  staticPage,
  type Challenge
} from "./challenge";
import { parseConcept, parseRecap, parseStory } from "./story";
import { needsModule } from "./js-runner";
import { runInWindow } from "./runner-harness.test-utils";
import { runSqlJob } from "./sql/sql-engine";
import { parseVisual } from "./visuals/model";
import { openTestDatabase } from "./sql/sql-test-db.test-utils";

type Manifest = {
  lessons: { slug: string; blocks: { type: string; markdown?: string }[] }[];
};
// Tests run from the repository root (see vitest.config.ts).
const courses: [string, Manifest][] = [
  [
    "HTML",
    JSON.parse(
      readFileSync("docs/examples/html-track.manifest.json", "utf8")
    ) as Manifest
  ],
  [
    "CSS",
    JSON.parse(
      readFileSync("docs/examples/css-track.manifest.json", "utf8")
    ) as Manifest
  ],
  ...(existsSync("docs/examples/js-track.manifest.json")
    ? [
        [
          "JavaScript",
          JSON.parse(
            readFileSync("docs/examples/js-track.manifest.json", "utf8")
          ) as Manifest
        ] as [string, Manifest]
      ]
    : []),
  ...(existsSync("docs/examples/sql-track.manifest.json")
    ? [
        [
          "SQL",
          JSON.parse(
            readFileSync("docs/examples/sql-track.manifest.json", "utf8")
          ) as Manifest
        ] as [string, Manifest]
      ]
    : [])
];
// One PostgreSQL (PGlite) for every SQL check, as the browser keeps one per page.
let database: ReturnType<typeof openTestDatabase> | null = null;
const sqlDatabase = () => (database ??= openTestDatabase());
afterAll(async () => {
  if (database) await (await database).close();
});
/** Static checks in DOMParser, runnable ones in the same sandbox document the browser uses. */
async function run(code: string, challenge: Challenge): Promise<boolean[]> {
  const stat = runChecks(
    code,
    challenge.checks,
    new DOMParser().parseFromString(staticPage(challenge, code), "text/html")
  );
  if (challenge.lang === "sql") {
    const { results } = await runSqlJob(
      await sqlDatabase(),
      sqlJob(challenge, code)
    );
    let q = 0;
    return challenge.checks.map((check, i) =>
      isSqlCheck(check) ? results[q++] === true : stat[i]!
    );
  }
  if (!isRunnable(challenge) || !challenge.checks.some(isRunCheck)) return stat;
  const { results } = await runInWindow({
    code,
    lang: challenge.lang === "js" ? "js" : "html",
    page: challenge.page,
    checks: challenge.checks.filter(isRunCheck)
  });
  let k = 0;
  return challenge.checks.map((check, i) =>
    isRunCheck(check) ? results[k++] === true : stat[i]!
  );
}

for (const [name, manifest] of courses) {
  const blocks = (lang: string) =>
    manifest.lessons.flatMap((lesson) =>
      lesson.blocks.flatMap((block) =>
        [
          ...(block.markdown ?? "").matchAll(
            new RegExp("```" + lang + "\\n([\\s\\S]*?)\\n```", "g")
          )
        ].map((m) => ({ lesson: lesson.slug, source: m[1]! }))
      )
    );
  const fences = blocks("challenge");

  describe(`${name} course challenges`, () => {
    it("every lesson has hands-on practice", () => {
      const withPractice = new Set(fences.map((f) => f.lesson));
      expect(
        manifest.lessons
          .filter((l) => !withPractice.has(l.slug))
          .map((l) => l.slug)
      ).toEqual([]);
    });
    it.each(fences.map((f, i) => [`${f.lesson} #${i}`, f.source] as const))(
      "%s is valid and solvable",
      async (_, source) => {
        const challenge = parseChallenge(source);
        expect(challenge, source).not.toBeNull();
        expect(challenge!.solution, "a solution is required").toBeTruthy();
        expect(
          await run(challenge!.solution!, challenge!),
          "the solution must pass every check"
        ).not.toContain(false);
        expect(
          await run(challenge!.start, challenge!),
          "the starting code must not already pass"
        ).toContain(false);
      },
      60000
    );
  });

  const sqlCards = blocks("concept").some(
    (b) => parseConcept(b.source)?.lang === "sql"
  );
  if (sqlCards)
    describe(`${name} course runnable SQL examples`, () => {
      const cards = blocks("concept")
        .map((b) => ({ ...b, concept: parseConcept(b.source) }))
        .filter((b) => b.concept?.lang === "sql" && b.concept.show);
      it.each(
        cards.map(
          (c) => [`${c.lesson}: ${c.concept!.name}`, c.concept!.how!] as const
        )
      )(
        "%s runs without an error",
        async (_, how) => {
          const { output } = await runSqlJob(await sqlDatabase(), {
            code: how
          });
          expect(output.kind, JSON.stringify(output)).not.toBe("error");
        },
        60000
      );
    });

  const examples = blocks("concept")
    .map((b) => ({ lesson: b.lesson, concept: parseConcept(b.source) }))
    .filter((e) => e.concept?.lang === "js" && e.concept.how);
  if (examples.length) {
    // Cards that exist to show an error are allowed to print one.
    const SHOWS_ERROR = new Set([
      "ReferenceError",
      "TypeError",
      "console.error()"
    ]);
    describe(`${name} course runnable examples`, () => {
      it.each(
        examples.map(
          (e) => [`${e.lesson}: ${e.concept!.name}`, e.concept!] as const
        )
      )(
        "%s runs without errors",
        async (_, concept) => {
          const { logs } = await runInWindow({
            code: concept.how!,
            lang: "js",
            page: concept.page,
            checks: [{ js: "await wait(700) || true" }],
            module: needsModule(concept.how!)
          });
          if (!SHOWS_ERROR.has(concept.name))
            expect(
              logs.filter((l) => l.level === "error"),
              concept.how
            ).toEqual([]);
        },
        15000
      );
    });
  }

  describe(`${name} course story blocks`, () => {
    it("every scene and concept card is valid, so none falls back to raw JSON", () => {
      expect(
        blocks("story")
          .filter((b) => !parseStory(b.source))
          .map((b) => b.lesson)
      ).toEqual([]);
      expect(
        blocks("concept")
          .filter((b) => !parseConcept(b.source))
          .map((b) => b.lesson)
      ).toEqual([]);
      expect(blocks("story").length).toBeGreaterThanOrEqual(
        manifest.lessons.length
      );
      // Every lesson opens with the story context, so it works on its own.
      const recaps = blocks("recap");
      expect(
        recaps.filter((b) => !parseRecap(b.source)).map((b) => b.lesson)
      ).toEqual([]);
      expect(
        manifest.lessons
          .filter((l) => !recaps.some((r) => r.lesson === l.slug))
          .map((l) => l.slug)
      ).toEqual([]);
    });
  });
}

// Card courses without scenes or hands-on tasks (characters spec 6.1): ПК and Браузер.
for (const [name, file] of [
  ["ПК", "docs/examples/pc-track.manifest.json"],
  ["Браузер", "docs/examples/browser-track.manifest.json"]
] as const) {
  const manifest = JSON.parse(readFileSync(file, "utf8")) as Manifest;
  const blocks = (lang: string) =>
    manifest.lessons.flatMap((lesson) =>
      lesson.blocks.flatMap((block) =>
        [
          ...(block.markdown ?? "").matchAll(
            new RegExp("```" + lang + "\\n([\\s\\S]*?)\\n```", "g")
          )
        ].map((m) => ({ lesson: lesson.slug, source: m[1]! }))
      )
    );

  describe(`${name} course blocks`, () => {
    it("every card, diagram and recap is valid, so none falls back to raw JSON", () => {
      for (const [lang, parse] of [
        ["concept", parseConcept],
        ["diagram", parseVisual],
        ["recap", parseRecap]
      ] as const)
        expect(
          blocks(lang)
            .filter((b) => !parse(b.source))
            .map((b) => b.lesson),
          lang
        ).toEqual([]);
      expect(blocks("recap").map((b) => b.lesson)).toEqual(
        manifest.lessons.map((l) => l.slug)
      );
    });

    const examples = blocks("concept")
      .map((b) => ({ lesson: b.lesson, concept: parseConcept(b.source) }))
      .filter((e) => e.concept?.lang === "js" && e.concept.show);
    it.each(
      examples.map(
        (e) => [`${e.lesson}: ${e.concept!.name}`, e.concept!] as const
      )
    )(
      "%s runs and prints without errors",
      async (_, concept) => {
        const { logs } = await runInWindow({
          code: concept.how!,
          lang: "js",
          checks: [{ js: "await wait(300) || true" }]
        });
        expect(
          logs.filter((l) => l.level === "error"),
          concept.how
        ).toEqual([]);
        expect(logs.length, concept.how).toBeGreaterThan(0);
      },
      15000
    );
  });
}

describe("challenge checks", () => {
  it("matches selectors, text, attributes, counts, absence and source fragments", () => {
    const checks = [
      { label: "h1", selector: "h1", text: "привет" },
      { label: "alt", selector: "img", attr: "alt" },
      { label: "two li", selector: "li", count: 2 },
      { label: "no b", selector: "b", absent: true },
      { label: "doctype", contains: "<!doctype html>" },
      { label: "lang", selector: "html", attr: "lang", value: "ru" }
    ];
    const ok =
      '<!DOCTYPE html><html lang="ru"><h1>Привет,  мир</h1><img src="a.png" alt=""><ul><li>1</li><li>2</li></ul></html>';
    expect(
      runChecks(ok, checks, new DOMParser().parseFromString(ok, "text/html"))
    ).toEqual([true, true, true, true, true, true]);
    const bad = "<h1>Hi</h1><img src=a.png><li>1</li><b>x</b>";
    expect(
      runChecks(bad, checks, new DOMParser().parseFromString(bad, "text/html"))
    ).toEqual([false, false, false, false, false, false]);
  });
  it("rejects malformed specs", () => {
    expect(parseChallenge("{")).toBeNull();
    expect(
      parseChallenge(
        '{"title":"t","task":"x","start":"","checks":[{"label":"a"}]}'
      )
    ).toBeNull();
    expect(
      parseChallenge(
        '{"title":"t","task":"x","start":"","checks":[{"label":"a","selector":"p","contains":"p"}]}'
      )
    ).toBeNull();
    expect(
      parseChallenge(
        '{"title":"t","task":"x","start":"","checks":[{"label":"a","selector":"p"}]}'
      )
    ).not.toBeNull();
  });
  it("accepts query checks only in SQL challenges, and page markup only in web ones", () => {
    const spec = (extra: object) =>
      JSON.stringify({ title: "t", task: "x", start: "", ...extra });
    expect(
      parseChallenge(
        spec({
          lang: "sql",
          checks: [
            { label: "a", rows: "SELECT 1", ordered: true },
            { label: "b", sql: "SELECT true" },
            { label: "c", contains: "select" }
          ]
        })
      )
    ).not.toBeNull();
    expect(
      parseChallenge(
        spec({
          lang: "sql",
          db: "empty",
          setup: "CREATE TABLE t (x int)",
          checks: [{ label: "a", sql: "SELECT true" }]
        })
      )
    ).not.toBeNull();
    expect(
      parseChallenge(spec({ checks: [{ label: "a", rows: "SELECT 1" }] }))
    ).toBeNull();
    expect(
      parseChallenge(
        spec({ lang: "sql", checks: [{ label: "a", selector: "p" }] })
      )
    ).toBeNull();
    expect(
      parseChallenge(
        spec({
          lang: "sql",
          checks: [{ label: "a", sql: "SELECT true", ordered: true }]
        })
      )
    ).toBeNull();
    expect(
      parseChallenge(
        spec({
          lang: "sql",
          db: "prod",
          checks: [{ label: "a", sql: "SELECT true" }]
        })
      )
    ).toBeNull();
    expect(
      parseChallenge(
        spec({ setup: "DROP TABLE x", checks: [{ label: "a", selector: "p" }] })
      )
    ).toBeNull();
  });
});
