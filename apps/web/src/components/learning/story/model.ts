import {
  BugIcon,
  DatabaseIcon,
  HeadphonesIcon,
  RobotIcon,
  SparkleIcon,
  UserIcon
} from "@phosphor-icons/react/dist/ssr";

/*
 * Story course blocks authored as JSON in Markdown fences:
 *   ```story   — a short messenger scene with the course characters;
 *   ```concept — a "what it is / why / how" card for one element or attribute.
 * Everything renders as text nodes; invalid JSON falls back to a code block.
 */

export const CHARACTERS = {
  bro: { name: "Бро", role: "браузер", color: "#7dd3fc", Icon: RobotIcon },
  nika: {
    name: "Ника",
    role: "наставница",
    color: "#ffa15c",
    Icon: SparkleIcon
  },
  lev: {
    name: "Лев",
    role: "слушает сайты скринридером",
    color: "#c4b5fd",
    Icon: HeadphonesIcon
  },
  bug: {
    name: "Вредный Скрипт",
    role: "злодей",
    color: "#fda4af",
    Icon: BugIcon
  },
  slon: {
    name: "Слон",
    role: "база данных PostgreSQL",
    color: "#93c5fd",
    Icon: DatabaseIcon
  },
  you: { name: "Вы", role: "", color: "#e4e4e7", Icon: UserIcon }
} as const;
export type Who = keyof typeof CHARACTERS;
export type Line = { who: Who; text: string };
export type Story = { title?: string | undefined; lines: Line[] };
export type ConceptKind =
  | "tag"
  | "attr"
  | "idea"
  | "property"
  | "selector"
  | "at-rule"
  | "function"
  | "value"
  | "keyword"
  | "operator"
  | "method"
  | "object"
  | "event"
  | "type"
  | "statement"
  | "clause"
  | "constraint";
export type Concept = {
  name: string;
  title: string;
  what: string;
  why: string;
  how?: string | undefined;
  lang?: string | undefined;
  show?: number | undefined;
  bro?: string | undefined;
  kind?: ConceptKind | undefined;
  page?: string | undefined;
};
const KINDS: readonly ConceptKind[] = [
  "tag",
  "attr",
  "idea",
  "property",
  "selector",
  "at-rule",
  "function",
  "value",
  "keyword",
  "operator",
  "method",
  "object",
  "event",
  "type",
  "statement",
  "clause",
  "constraint"
];

const str = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const json = (source: string): Record<string, unknown> | null => {
  try {
    const value: unknown = JSON.parse(source);
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

export function parseStory(source: string): Story | null {
  const v = json(source);
  if (
    !v ||
    !Array.isArray(v.lines) ||
    v.lines.length < 1 ||
    v.lines.length > 14
  )
    return null;
  const lines: Line[] = [];
  for (const raw of v.lines as unknown[]) {
    if (
      !Array.isArray(raw) ||
      raw.length !== 2 ||
      !(raw[0] in CHARACTERS) ||
      !str(raw[1], 600)
    )
      return null;
    lines.push({ who: raw[0] as Who, text: raw[1] });
  }
  return { title: str(v.title, 120) ? v.title : undefined, lines };
}

export function parseConcept(source: string): Concept | null {
  const v = json(source);
  if (
    !v ||
    !str(v.name, 80) ||
    !str(v.title, 120) ||
    !str(v.what, 600) ||
    !str(v.why, 600)
  )
    return null;
  if (v.how !== undefined && !str(v.how, 3000)) return null;
  if (v.bro !== undefined && !str(v.bro, 300)) return null;
  // Fixed markup a JavaScript example runs on (for DOM cards).
  if (v.page !== undefined && !(str(v.page, 1500) && v.lang === "js"))
    return null;
  if (v.lang !== undefined && !(str(v.lang, 20) && /^[a-z]+$/.test(v.lang)))
    return null;
  if (v.kind !== undefined && !KINDS.includes(v.kind as ConceptKind))
    return null;
  if (
    v.show !== undefined &&
    !(
      Number.isInteger(v.show) &&
      (v.show as number) >= 40 &&
      (v.show as number) <= 600
    )
  )
    return null;
  return {
    name: v.name,
    title: v.title,
    what: v.what,
    why: v.why,
    how: v.how,
    kind: v.kind as ConceptKind | undefined,
    lang: v.lang,
    show: v.show as number | undefined,
    bro: v.bro,
    page: v.page
  };
}

/** What a card is about: a tag (`<p>`), an attribute (`href`) or a plain idea (Сервер). */
export function conceptKind(name: string): "tag" | "attr" | "idea" {
  if (name.startsWith("<")) return "tag";
  if (/^[a-z][a-z0-9-]*(?:[=:*\s·]|$)/.test(name)) return "attr";
  return "idea";
}
export const KIND_LABEL: Record<ConceptKind, string> = {
  tag: "Тег",
  attr: "Атрибут",
  idea: "Понятие",
  property: "Свойство",
  selector: "Селектор",
  "at-rule": "@-правило",
  function: "Функция",
  value: "Значение",
  keyword: "Ключевое слово",
  operator: "Оператор",
  method: "Метод",
  object: "Объект",
  event: "Событие",
  type: "Тип",
  statement: "Команда",
  clause: "Часть запроса",
  constraint: "Ограничение"
};

export type Recap = {
  now: string;
  premise?: string | undefined;
  cast?: Who[] | undefined;
};
export function parseRecap(source: string): Recap | null {
  const v = json(source);
  if (!v || !str(v.now, 300)) return null;
  const cast =
    Array.isArray(v.cast) &&
    v.cast.length <= 6 &&
    v.cast.every((w) => typeof w === "string" && w in CHARACTERS)
      ? (v.cast as Who[])
      : undefined;
  return {
    now: v.now,
    premise: str(v.premise, 160) ? v.premise : undefined,
    cast
  };
}
/** Tool characters only: courses are not tied to one storyline or business (ADR-0066). */
export const CAST: Who[] = ["bro", "nika"];
