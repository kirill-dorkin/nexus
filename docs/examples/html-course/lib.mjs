// Authoring helpers for the "HTML: полный курс" manifest.
// Lessons are Markdown; ```html fences become runnable in the learner sandbox.

const FENCE = "```";

const challengeFence = (spec) => `${FENCE}challenge\n${JSON.stringify(spec, null, 2)}\n${FENCE}`;

/**
 * Puts hands-on challenges into a lesson. A challenge with `at` goes to the end of that
 * "## " section; the rest replace the unchecked "## Практика" section (or close the lesson).
 */
function placeChallenges(markdown, list) {
  if (!list.length) return markdown;
  const sections = markdown.split(/\n(?=## )/);
  const heading = (section) => section.split("\n", 1)[0].replace(/^## /, "").trim();
  const practice = [];
  for (const { at, ...spec } of list) {
    if (!at) { practice.push(spec); continue; }
    const i = sections.findIndex((section) => heading(section) === at);
    if (i < 0) throw new Error(`Challenge "${spec.title}": no section "${at}"`);
    sections[i] = `${sections[i].trimEnd()}\n\n${challengeFence(spec)}`;
  }
  if (practice.length) {
    const block = `## Ваш ход\n\n${practice.map(challengeFence).join("\n\n")}`;
    const i = sections.findIndex((section) => heading(section) === "Практика");
    if (i >= 0) sections[i] = block;
    else sections.push(block);
  }
  return sections.join("\n");
}

export function createCourse(challenges = {}, stories = {}, recaps = {}) {
  const skills = [];
  const activities = [];
  const lessons = [];

  /** Question Markdown strips raw HTML, so tags in questions render as inline code. */
  const q = (text) =>
    text
      .split(/(`[^`]*`)/)
      .map((part) =>
        part.startsWith("`")
          ? part
          : part
              .replace(/<([a-z][a-z0-9-]*)\b[^>]*>(?:[^<]*<\/\1>)?/gi, (m) => "`" + m + "`")
              .replace(/&[a-z]+;/gi, (m) => "`" + m + "`")
      )
      .join("");

  const add = (type, slug, skillKey, title, question, extra) => {
    activities.push({
      slug,
      type,
      title,
      instructions:
        type === "quiz.single_choice"
          ? "Выберите один ответ."
          : type === "quiz.multiple_choice"
            ? "Выберите все подходящие варианты."
            : "Введите короткий ответ без лишних пробелов.",
      skillKeys: [skillKey],
      ...extra(q(question))
    });
    return slug;
  };
  const options = (list) => list.map(([id, text]) => ({ id, text }));

  return {
    html: (code) => `${FENCE}html\n${code.trim()}\n${FENCE}`,
    code: (lang, src) => `${FENCE}${lang}\n${src.trim()}\n${FENCE}`,
    // Lessons are self-contained: no outbound "read more" links.
    mdn: () => "",
    /** Coloured diagram rendered by the lesson page (kinds: url, tree, flow, dom). */
    diagram: (spec) => `${FENCE}diagram\n${JSON.stringify(spec, null, 2)}\n${FENCE}`,
    /**
     * Hands-on task checked live in the browser:
     * challenge({ title, task, start, checks: [{ label, selector | contains, text?, attr?, value?, count?, absent? }], hint?, solution? })
     */
    challenge: challengeFence,
    /** Silent animation rendered by the lesson page (kind: typing). */
    demo: (spec) => `${FENCE}demo\n${JSON.stringify(spec, null, 2)}\n${FENCE}`,
    /**
     * lesson({ slug, title, minutes, summary, skill: [key, title, description],
     *          body: [markdown parts], quizzes: [ (key) => slug, ... ] })
     * The first quiz is required practice; the rest are optional homework.
     */
    lesson({ slug, title, minutes, summary, skill, body, quizzes, allRequired = false }) {
      const [key, skillTitle, skillDescription] = skill;
      skills.push({ key, title: skillTitle, description: skillDescription });
      // A rewritten story body (stories/*.mjs) replaces the original prose of the lesson.
      const parts = [recaps[slug] ? `${FENCE}recap\n${JSON.stringify({ now: recaps[slug] })}\n${FENCE}` : "", ...(stories[slug] ?? body)];
      const markdown = placeChallenges(parts.filter(Boolean).join("\n\n").trim(), challenges[slug] ?? []);
      const blocks = [{ type: "markdown", markdown }];
      quizzes.forEach((make, index) => {
        const activitySlug = make(key);
        const required = allRequired || index === 0;
        blocks.push({ type: "activity", activitySlug, kind: required ? "practice" : "homework", required });
      });
      lessons.push({ slug, title, summary, durationMinutes: minutes, blocks });
    },
    single: (slug, title, question, list, correct, explanation) => (skillKey) =>
      add("quiz.single_choice", slug, skillKey, title, question, (question) => ({
        presentation: { question, options: options(list) },
        validation: { correctOptionId: correct, explanation }
      })),
    multi: (slug, title, question, list, correct, explanation) => (skillKey) =>
      add("quiz.multiple_choice", slug, skillKey, title, question, (question) => ({
        presentation: { question, options: options(list) },
        validation: { correctOptionIds: correct, explanation }
      })),
    short: (slug, title, question, answers, explanation) => (skillKey) =>
      add("quiz.short_text", slug, skillKey, title, question, (question) => ({
        presentation: { question },
        validation: { acceptedAnswers: answers, caseSensitive: false, explanation }
      })),
    manifest: (course) => ({ schemaVersion: 1, course, skills, activities, lessons })
  };
}
