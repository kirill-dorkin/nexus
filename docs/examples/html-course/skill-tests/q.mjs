// Helpers for the skill-test banks (P1.2, ADR-0075). Each helper returns one question object of the
// shared format: { key, kind, prompt, code?, options?, correct?, accepted?, caseSensitive?, explanation }.
//
// Prompts and question explanations are Markdown, and Markdown strips raw HTML, so tags in them are
// wrapped in backticks automatically. Option texts and option explanations are plain text.

/** Wraps bare tags and character references in backticks, leaving existing inline code alone. */
const md = (text) =>
  text
    .split(/(`[^`]*`)/)
    .map((part) =>
      part.startsWith("`")
        ? part
        : part
            .replace(/<\/?[a-z][a-z0-9-]*\b[^>]*>(?:[^<`]*<\/[a-z][a-z0-9-]*>)?/gi, (m) => "`" + m + "`")
            .replace(/&[a-z]+;|&#x?[0-9a-f]+;/gi, (m) => "`" + m + "`")
    )
    .join("");

/** A right option: its text and why it is right. */
export const ok = (text, why) => ({ text, why, right: true });
/** A wrong option: its text and why it is wrong. */
export const no = (text, why) => ({ text, why, right: false });

export const html = (source) => ({ language: "html", source });
export const css = (source) => ({ language: "css", source });
export const js = (source) => ({ language: "js", source });
export const plain = (source) => ({ language: "text", source });

const code = (value) => {
  const block = typeof value === "string" ? html(value) : value;
  return { language: block.language, source: block.source.replace(/^\n+|\s+$/g, "") };
};

/** Stable, key-based rotation so the right answer is not always the first option. */
const shift = (key, length) => [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % length;

function choice(kind, key, prompt, list, explanation, block) {
  const start = shift(key, list.length);
  const ordered = [...list.slice(start), ...list.slice(0, start)];
  const options = ordered.map((option, index) => ({ id: "abcdefgh"[index], text: option.text, explanation: option.why }));
  return {
    key,
    kind,
    prompt: md(prompt),
    ...(block ? { code: code(block) } : {}),
    options,
    correct: options.filter((_, index) => ordered[index].right).map((option) => option.id),
    explanation: md(explanation)
  };
}

/** One right answer. `block` is optional code shown with the question. */
export const one = (key, prompt, list, explanation, block) => choice("single_choice", key, prompt, list, explanation, block);
/** Several right answers. */
export const many = (key, prompt, list, explanation, block) => choice("multiple_choice", key, prompt, list, explanation, block);
/** "What will the page show / what will happen" for the given code. */
export const out = (key, prompt, block, list, explanation) => choice("code_output", key, prompt, list, explanation, block);
/** "Find the mistake" in the given code. */
export const bug = (key, prompt, block, list, explanation) => choice("find_bug", key, prompt, list, explanation, block);
/** A short typed answer; `accepted` lists every acceptable spelling. */
export const short = (key, prompt, accepted, explanation, { block, caseSensitive = false } = {}) => ({
  key,
  kind: "short_text",
  prompt: md(prompt),
  ...(block ? { code: code(block) } : {}),
  accepted,
  caseSensitive,
  explanation: md(explanation)
});
