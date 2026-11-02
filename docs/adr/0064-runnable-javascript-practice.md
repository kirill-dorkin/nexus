# ADR-0064: Runnable JavaScript practice in the learner's browser

- Status: Accepted
- Date: 2026-11-02
- Related: ADR-0007 (separate grader security boundary), ADR-0018 (attempt/submission lifecycle), ADR-0020 (validator registry)

## Context

Lesson challenges (```challenge fences) are practice: the learner edits code, declarative checks light up live, and nothing is submitted. HTML and CSS checks are static. They read the learner's markup through an inert `DOMParser` or the stylesheet through `css-rules.ts`, and no learner code ever executes.

A JavaScript course cannot be checked statically. Whether `add(2, 3)` returns 5, what was printed to the console, or what happens after a click is only known by running the code. Concept cards also need to show what an example prints.

## Decision

1. **Learner JavaScript runs only in the learner's own browser**, inside an iframe with `sandbox="allow-scripts"` and **never** `allow-same-origin`.
   - The frame has an opaque origin: it cannot read the site's cookies, storage or DOM, or call the API as the learner.
2. **The network is closed.** The runner document starts with a CSP meta tag: `default-src 'none'`, inline scripts and styles only, `data:` images and fonts.
   - Lessons about `fetch()` use an offline teaching API (`/api/menu`, `/api/menu/:id`, `POST /api/orders`), served by a prelude stub inside the frame.
3. **Endless loops are stopped.**
   - Braced `for`, `while` and `do` bodies get a time guard. A synchronous run longer than 1.5 s throws a visible error instead of freezing the tab.
   - The guard is per synchronous task, so loops inside later event handlers are not affected.
4. **Checks are author-written and declarative.**
   - `js` is an expression, possibly using `await`, evaluated after the page loads.
   - `log` is text the code must print.
   - These checks run in a separate hidden check frame, so a check that clicks or mutates state does not disturb the visible preview. Results come back by `postMessage`. A message is accepted only when it comes from that frame's window and carries the frame's token.
   - Check expressions may not contain `</script`.
5. **Practice never becomes evidence.** Challenge results stay in the browser (a solved flag in `localStorage`). Official progress, Evidence and Mastery still come only from server-graded activities.
   - Server-side or untrusted grading of code remains the job of the separate grader boundary (ADR-0007). This client sandbox is not a grader and must not be used as one.

The same runner document is used in three places:
- the challenge preview, which draws the console under the page;
- the hidden check frame;
- JavaScript concept cards (`lang: "js"`), which run the example and size the frame by message.

Tests load this exact document into a happy-dom window with script evaluation enabled. This proves that every authored solution passes and every starting code fails.

## Consequences

- The JavaScript course can have real, live-checked practice without a server round trip or any new data model.
- A learner can only affect their own tab. The worst case is a tab busy for up to the guard time, or a long-running asynchronous loop that never yields to a braced body; closing the lesson ends it.
- The loop guard is a light source transform, not a parser. A missed guard in an exotic construct (a brace-less loop, a regular-expression literal that contains quotes) only removes protection; it never changes the meaning of correct code.
- Challenge specs gain `lang: "js"`, a fixed `page`, and the `js` and `log` check kinds. HTML and CSS challenges keep the fully restricted `sandbox=""` preview.

## Amendment (JavaScript course content)

- Concept-card examples that use top-level `await` run as `<script type="module">` (`needsModule`). Challenges stay classic scripts, so their checks can read the learner's top-level bindings.
- An opaque origin has no Web Storage, so the prelude installs an in-memory `localStorage`/`sessionStorage`. Its data lives only as long as one run, which lessons about storage state explicitly.
- `course-challenges.test.ts` also runs every JavaScript concept example. An example fails the test if it logs an error, unless the card exists to show that error.

## Amendment (complete JavaScript course)

- The runner CSP also allows `'unsafe-eval'`, so lessons can demonstrate `eval` and `new Function`. This adds no capability: the frame already runs arbitrary learner code, and isolation still comes from the opaque origin and `default-src 'none'`.
- Checker internals use `__`-prefixed names, so a learner's own globals (`has`, `logs`) are never shadowed in check expressions.
- The JavaScript course covers the whole of ECMAScript 2025: `docs/examples/js-course/spec-index.json` is a snapshot of the syntax and of every standard built-in member, read from the engine. The contracts test requires every item to be covered by exactly one concept card (its `covers`), with at most four items per card (eight for Annex B legacy).
