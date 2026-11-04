# ADR-0075: Skill test drawn from a protected question bank

- Status: Proposed (owner decision and a migration needed)
- Date: 2026-11-05

## Context

Spec v3 (`docs/roadmap/characters-spec.md`, section 5.2): a skill counts only after the learner confirms it by a test. Today each skill has 2–3 fixed quizzes inside its lesson (ADR-0053, ADR-0056). Repeating the same questions on every review does not prove memory. So spaced repetition (ADR-0076) needs a varied test.

## Decision

1. **Question bank per skill.**
   - A manifest may declare `skillTests: [{ skillKey, questions: [...] }]` with at least 12 questions per skill.
   - Question types: the existing quiz kinds `single_choice`, `multiple_choice` and `short_text`, plus `code_output` and `find_bug`. The last two are single choice with a code block in the presentation.
   - Each question carries an explanation for every wrong option.
   - Answers and explanations are protected the same way as quiz configs today (`learning_content.quiz_validation_configs` pattern) in a new table `learning_content.skill_question_configs`. Public lesson payloads never include them.
2. **Test session.**
   - `POST /v1/me/learning/:org/skills/:skillKey/tests` draws 5 questions uniformly without replacement, preferring questions the learner saw least. It returns presentations only.
   - The draw is stored as an Attempt with the question ids pinned, so the server checks exactly what it showed.
   - `POST …/tests/:attemptKey/submission` answers all five at once.
   - Pass threshold: 4 of 5.
   - A failed test may be retaken after 10 minutes with a new draw; the rate limit follows ADR-0070.
3. **Evidence.** A passed test records one normalized passing Evidence for the skill, with `validation definition skill_test@1`. A failed test records failing Evidence. Mastery (ADR-0005) and confirmation days (`GET /v1/me/skills/{org}`) need no change: a confirmation is a day with passing Evidence.
4. **Branch test (extern).** The same mechanism draws one question per skill of a branch. Passing confirms every skill of the branch: one Evidence per skill, all from one Submission.
5. **Existing quizzes stay.** They remain lesson practice and keep producing Evidence, so learners' history is unchanged.

## Consequences

- One migration: the `skill_question_configs` table with RLS, plus grants.
- Content work: HTML, CSS, JS and SQL need 12+ questions for each of 289 skills, about 3,500 questions, produced by the content pipeline of spec 5.8.
- The test route is a new write path for learners. It needs the same Origin, rate-limit and own-Enrollment checks as quiz checks.
