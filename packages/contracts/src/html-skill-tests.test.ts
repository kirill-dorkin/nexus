import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The HTML skill-test banks (P1.2, ADR-0075) live next to the course sources as plain modules.
type Option = { id: string; text: string; explanation: string };
type Question = {
  key: string;
  kind: string;
  prompt: string;
  code?: { language: string; source: string };
  options?: Option[];
  correct?: string[];
  accepted?: string[];
  caseSensitive?: boolean;
  explanation: string;
};
type Bank = { skillKey: string; questions: Question[] };

const bankUrl = new URL("../../../docs/examples/html-course/skill-tests/index.mjs", import.meta.url).href;
const loadBanks = async (): Promise<Bank[]> => ((await import(bankUrl)) as { default: Bank[] }).default;

function htmlSkillKeys(): string[] {
  const map = JSON.parse(
    readFileSync(new URL("../../../apps/web/src/lib/skill-map/skill-map.json", import.meta.url), "utf8")
  ) as { characters: { slug: string; branches: { skills: { key: string }[] }[] }[] };
  const html = map.characters.find((character) => character.slug === "html");
  return html!.branches.flatMap((branch) => branch.skills.map((skill) => skill.key));
}

const KINDS = new Set(["single_choice", "multiple_choice", "short_text", "code_output", "find_bug"]);
const SINGLE = new Set(["single_choice", "code_output", "find_bug"]);
const LANGUAGES = new Set(["html", "css", "js", "text"]);

const everyQuestion = (banks: Bank[]) =>
  banks.flatMap((bank) => bank.questions.map((question) => ({ skill: bank.skillKey, question, where: `${bank.skillKey}/${question.key}` })));

describe("HTML skill-test banks", () => {
  it("cover every HTML skill with 12–15 questions and nothing else", async () => {
    const banks = await loadBanks();
    const keys = htmlSkillKeys();
    expect(keys).toHaveLength(68);
    expect(banks.map((bank) => bank.skillKey).sort()).toEqual([...keys].sort());
    for (const bank of banks) {
      expect(bank.questions.length, bank.skillKey).toBeGreaterThanOrEqual(12);
      expect(bank.questions.length, bank.skillKey).toBeLessThanOrEqual(15);
    }
  });

  it("give each skill at least three code questions: what it shows or where the mistake is", async () => {
    for (const bank of await loadBanks()) {
      const code = bank.questions.filter((question) => question.kind === "code_output" || question.kind === "find_bug");
      expect(code.length, bank.skillKey).toBeGreaterThanOrEqual(3);
    }
  });

  it("keep stable, unique question keys within each skill", async () => {
    for (const bank of await loadBanks()) {
      const keys = bank.questions.map((question) => question.key);
      expect(new Set(keys).size, bank.skillKey).toBe(keys.length);
      for (const key of keys) expect(key, bank.skillKey).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("keep answer keys coherent and explain every option", async () => {
    for (const { question, where } of everyQuestion(await loadBanks())) {
      expect(KINDS.has(question.kind), where).toBe(true);
      expect(question.prompt.trim().length, where).toBeGreaterThan(0);
      expect(question.prompt.length, where).toBeLessThanOrEqual(2000);
      expect(question.explanation.trim().length, where).toBeGreaterThan(0);
      expect(question.explanation.length, where).toBeLessThanOrEqual(2000);
      if (question.code) {
        expect(LANGUAGES.has(question.code.language), where).toBe(true);
        expect(question.code.source.trim().length, where).toBeGreaterThan(0);
        expect(question.code.source.length, where).toBeLessThanOrEqual(4000);
      }
      if (question.kind === "code_output" || question.kind === "find_bug") expect(question.code, where).toBeDefined();

      if (question.kind === "short_text") {
        expect(question.options, where).toBeUndefined();
        expect(question.accepted?.length, where).toBeGreaterThan(0);
        for (const answer of question.accepted!) expect(answer.trim(), where).toBe(answer);
        expect(typeof question.caseSensitive, where).toBe("boolean");
        continue;
      }
      const options = question.options ?? [];
      expect(options.length, where).toBeGreaterThanOrEqual(2);
      expect(options.length, where).toBeLessThanOrEqual(8);
      const ids = options.map((option) => option.id);
      expect(new Set(ids).size, where).toBe(ids.length);
      expect(new Set(options.map((option) => option.text)).size, where).toBe(options.length);
      for (const option of options) {
        expect(option.text.trim().length, where).toBeGreaterThan(0);
        expect(option.explanation.trim().length, `${where}/${option.id}`).toBeGreaterThan(0);
      }
      const correct = question.correct ?? [];
      expect(new Set(correct).size, where).toBe(correct.length);
      for (const id of correct) expect(ids, where).toContain(id);
      if (SINGLE.has(question.kind)) expect(correct, where).toHaveLength(1);
      else expect(correct.length, where).toBeGreaterThanOrEqual(1);
    }
  });

  it("show tags in Markdown prompts and explanations as inline code, because Markdown strips raw HTML", async () => {
    for (const { question, where } of everyQuestion(await loadBanks()))
      for (const markdown of [question.prompt, question.explanation]) {
        const outsideCode = markdown.replace(/`[^`]*`/g, "");
        expect(outsideCode, where).not.toMatch(/<[a-z/!][^>]*>|&[a-z]+;|&#/i);
      }
  });

  it("have no storyline and never send the learner elsewhere", async () => {
    const text = JSON.stringify(await loadBanks());
    const banned =
      /"(marta|sonya|dasha)"|zerno|(?<!\p{L})Зерн|кофе|латте|капучино|эспрессо|бариста|какао|чизкейк|напит|столик|кухн|сироп|молок|(?<!\p{L})(раф|гост[ьяеиюй]\p{L}*|Март[аыу]|Сон[яиеу]|Тимур\p{L}*)(?!\p{L})/giu;
    expect([...new Set(text.match(banned) ?? [])]).toEqual([]);
    const elsewhere =
      /(?<![\w.])MDN(?![\w.])|developer\.mozilla|w3schools|stackoverflow|stack overflow|validator\.w3|google|гугл|загугл|поищи|почитай (в|на)|читай документаци|подробнее (в|на) |\]\(/giu;
    expect([...new Set(text.match(elsewhere) ?? [])]).toEqual([]);
    // Example addresses only use reserved example domains or local hosts.
    const hosts = [...text.matchAll(/\bhttps?:\/\/([^/\s"'`<>)\\]+)/g)].map((match) => match[1]!.toLowerCase());
    const foreign = hosts.filter((host) => !/(^|\.)example\.(com|org|net)(:\d+)?$|^localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/.test(host));
    expect([...new Set(foreign)]).toEqual([]);
  });
});
