# ADR-0072: Shared static HTML/CSS checks and the server HTML parser

- Status: Accepted
- Date: 2026-11-04
- Related: ADR-0011 (dependency lifecycle security), ADR-0020 (validator registry), ADR-0056 (deterministic learner quiz checks), ADR-0064 (runnable JavaScript practice), ADR-0065 (SQL practice in the browser)

## Context

Lesson challenges (```challenge fences, 351 in the published courses) are checked only in the learner's browser. The checks for HTML and CSS are static: a CSS selector must match the parsed page, a source fragment must appear, a CSS declaration must be written for a selector. They never execute the learner's code.

The next feature (downloadable assignments, WP-5 of `docs/roadmap/product-development-spec.md`) needs the same checks as a **trusted** server-side validator whose result becomes a ValidationResult and Evidence. Two implementations of the same rules would drift, and a learner would see a preview that the server then contradicts. The browser implementation used `DOMParser`, which does not exist in Node.

## Decision

1. **One package, `@platform/checks`.** It owns the challenge types (`ChallengeCheck`, `Challenge`), `parseChallenge`, the CSS reader (`readCss`, `cssMatches`) and the static evaluator (`runChecks`, `runStaticChecks`). It has no browser globals and no Node APIs. The parsed page is injected: `runChecks(code, checks, doc)` reads only `doc.querySelectorAll(selector)` and, on each element, `textContent`, `hasAttribute` and `getAttribute` (`CheckDocument`). `runStaticChecks` takes a `parseHtml(source) → CheckDocument` and parses only when a selector check needs it.
2. **Runnable and SQL checks stay in Web.** `js`, `log`, `sql` and `rows` checks need the browser sandbox (ADR-0064) or PGlite (ADR-0065); the evaluator reports them as not passed, and Web merges their results as before. The SQL job, storage keys and UI stay in `apps/web`.
3. **The browser passes `DOMParser`.** Web behaviour and UI are unchanged.
4. **The server adapter is `@platform/checks/server`: parse5 + css-select.** `parseHtmlOnServer(source)` builds the tree with parse5 (the HTML standard's tree construction, the algorithm browsers use), with the htmlparser2 tree adapter, and runs selectors with css-select. It matches what `DOMParser` gives a page: scripting is disabled (so `<noscript>` content is markup), and `<template>` content is not part of the document.
5. **Limits.** The server refuses, with `UncheckablePageError`, a page longer than 1 000 000 characters or one that nests deeper than 512 elements (Chrome's DOM depth limit). The depth is counted on parse5's own stack of open elements, so quotes, comments or raw text cannot hide it; parse5 scans that stack for many start tags, and 20 000 nested `<div>`s would otherwise take seconds. The caller decides what the learner sees. The CSS reader finds `<style>` elements and comments in one pass and skips blocks nested deeper than 16, so hostile CSS cannot make it quadratic or overflow the stack.
6. **Equivalence is tested.** `packages/checks/src/equivalence.test.ts` runs every HTML/CSS challenge of the course manifests in `docs/examples/` through happy-dom (the browser test double) and the server adapter: the solution passes every static check in both, and the starting code gets the same result per check. A deviation is allowed only when happy-dom breaks the HTML parsing standard, the server agrees with Chrome, and the test lists it with a reason. There is one: `<ul>` inside an open `<p>` (Chrome and parse5 close the paragraph).

### Parser choice

| | linkedom 0.18 | parse5 7.3 + css-select 5.2 |
|---|---|---|
| Tree construction | htmlparser2 (not the HTML standard): no implied `<tbody>`, `<html>`/`<body>` structure differs | The HTML standard, like `DOMParser` |
| Course challenges, compared with happy-dom | 3 of 982 check results differ; **2 reference solutions fail** (`tbody td`, `body > a:first-child`) | 1 differs, a happy-dom bug; matches Chrome |
| License | ISC; dependencies MIT, BSD-2-Clause, ISC | parse5 and tree adapter MIT; css-select, domhandler, domutils, css-what, nth-check, entities, dom-serializer, domelementtype BSD-2-Clause; boolbase ISC |
| Install scripts | none | none |
| Module format | ESM, CJS build that requires ESM-only css-select 7 / htmlparser2 10 | CommonJS and ESM builds in every package |
| Packages installed | 20 (two versions each of domhandler, domutils, entities) | 12 |

The parse5 line is chosen: it builds the same tree as a browser, so a server verdict can be trusted to match what the learner previewed. These versions ship CommonJS, which matters because the API is compiled to CommonJS and an ESM-only dependency already took the Vercel API down once (#164, #166). The newer majors (parse5 8, css-select 6–7, domhandler 6, domutils 4) are ESM-only; moving to them waits until the API runs as ESM or a Vercel preview proves `require(esm)` there. Dependabot ignores those majors with that reason.

All four direct dependencies are pinned to exact versions in `packages/checks/package.json`; the lockfile pins the rest with integrity hashes. No build approval is added. The adapter is the only part that imports them; `@platform/checks` itself has no runtime dependencies, so the lesson page's JavaScript does not grow.

## Consequences

- `@platform/checks` is a technical package like `@platform/contracts`: a pure, deterministic evaluator without state. Attempts, Submissions, ValidationResults and Evidence stay in `learning-validation` and `learner-learning`.
- WP-5's `assignment.files@1` validator calls `runStaticChecks(page, code, checks, parseHtmlOnServer)` and the browser preview calls the same function with `DOMParser`.
- The existing practice keeps its behaviour. One authored check (`p ul` absent in the HTML lesson `code-quality`) does not catch a list inside a paragraph in a real browser, because the browser closes the paragraph; course content should replace it, for example with `p:empty` absent, which catches the empty paragraph the stray `</p>` leaves (and then moves the listed happy-dom deviation to that check).
- The depth bound subclasses parse5's exported `Parser` (marked internal) and overrides `onItemPush`. parse5 is pinned exactly, and the server tests (a page refused at depth 513, accepted at 512) fail if an upgrade changes that hook.
- `@platform/checks` builds a CommonJS `dist/` like `@platform/contracts`, so the API can `require` it when WP-5 adds it as a dependency.
- A selector that one engine supports and the other does not would show up as a difference in the equivalence test; new course challenges are covered automatically.
