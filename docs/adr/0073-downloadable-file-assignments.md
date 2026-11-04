# ADR-0073: Downloadable file assignments with trusted static checks

- Status: Accepted
- Date: 2026-11-04

## Context

Lesson practice (ADR-0064, ADR-0065) runs in the learner's browser and never becomes Evidence: the learner controls the browser. The owner wants a second kind of task: the learner downloads an assignment, works on it in their own editor, uploads the files, and is told automatically what to fix. For HTML and CSS the result should count as Evidence.

ADR-0072 made the static checks a shared package (`@platform/checks`) with a server adapter that parses HTML without executing anything. That makes a trusted check possible without the grader sandbox (ADR-0007): reading markup and stylesheets is not running learner code.

## Decision

**Activity.** A new activity type `assignment.files`:

| Field | Meaning | Visible to the learner |
|---|---|---|
| `instructions` | the task | yes |
| `lang` | `html` in this version (HTML with CSS files) | yes |
| `entry` | the page file, default `index.html` | yes |
| `starterFiles` | path → content, packed into the download | yes |
| `allowedFiles` | exact paths or `dir/*.ext` patterns the upload may contain | yes |
| `checks` | static checks of ADR-0064 kinds: `selector` (+ `text`, `attr`, `value`, `count`, `max`, `absent`), `contains`, `css` | the `label` only |
| `solutionFiles` | the reference solution | no |

`checks` and `solutionFiles` are protected Content like quiz answer keys: stored apart from the learner-visible activity configuration and never returned to learners.

**Evaluation.** `evaluateAssignment(files, assignment, parseHtml)` in `@platform/checks`:

- the page is `files[entry]`; selector checks run on it;
- `contains` and `css` checks read the entry page followed by every `.css` file in path order, so a rule may live in `<style>` or in a stylesheet;
- each check yields `{ label, passed }`; `score` is the share passed; the outcome is `passed` only when every check passes.

The same function runs in the browser (preliminary, labelled as such) and in the API (trusted). JavaScript and SQL assignments are not part of this version: they need execution and stay browser practice until a separate decision.

**Upload limits** (checked in the browser and again on the server): at most 50 files, 200 KB per file, 512 KB in total (half the API body limit of 1 MB, so the JSON-escaped files always fit); UTF-8 text; paths relative, without `..`, backslashes or empty segments, at most 5 levels, matching `allowedFiles`; the entry file must be present. Larger pages are refused before parsing (`MAX_SERVER_PAGE_LENGTH`), and markup deeper than `MAX_TREE_DEPTH` is refused, as in ADR-0072.

**Lifecycle.** A learner submission is an Attempt with one Submission whose payload is `{ files }` (ADR-0018). The server evaluation is a ValidationResult from the versioned validator `assignment.files@1` and is normalized into Evidence for the activity's skills, like quizzes (ADR-0056). An infrastructure failure is `system_error`, never a learner failure. Publication refuses an assignment whose `solutionFiles` do not pass its own checks.

## Consequences

- Learners get feedback per check, and HTML/CSS assignments count towards skills.
- No sandbox, no file storage and no worker are needed: files are short text inside the Submission.
- Delivered in slices: this ADR, the assignment contract and `evaluateAssignment`; then the protected checks table (a migration the owner applies); then manifest import, publication and the learner route; then the Web block; then Studio.

## Alternatives

- **Grader sandbox for every assignment.** Rejected for HTML/CSS: static reading needs no execution, and the sandbox is not active in production.
- **Only browser checks.** Rejected: learners could fake a pass, so it could not be Evidence.
- **Archives in object storage.** Rejected for now: text files within the limits fit the Submission payload and keep one source of truth.
