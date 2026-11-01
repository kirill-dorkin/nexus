/**
 * Turns a story line into text a Russian voice can pronounce, and gives each line a stable id.
 * Shared by the browser voice player and the offline clip generator (scripts/voice-lines.mjs),
 * so both always agree on what is said and which clip belongs to which line.
 */

const WORDS: Record<string, string> = {
  html: "эйч-ти-эм-эль", css: "си-эс-эс", javascript: "джаваскрипт", js: "джаваскрипт", dom: "дом",
  h1: "эйч один", h2: "эйч два", h3: "эйч три", h4: "эйч четыре", h5: "эйч пять", h6: "эйч шесть",
  p: "пэ", a: "а", ul: "ю-эль", ol: "о-эль", li: "эл-ай", dl: "ди-эль", dt: "ди-ти", dd: "ди-ди",
  div: "див", span: "спан", img: "имидж", src: "эс-эр-си", alt: "альт", href: "эйч-реф",
  nav: "нав", main: "мейн", header: "хедер", footer: "футер", section: "секшн", article: "артикл",
  aside: "эсайд", strong: "стронг", em: "эм", br: "би-ар", hr: "эйч-ар", class: "класс", id: "ай-ди",
  lang: "ланг", ru: "ру", en: "и-эн", title: "тайтл", head: "хэд", body: "боди", meta: "мета",
  charset: "чарсет", utf: "ю-ти-эф", form: "форм", input: "инпут", label: "лейбл", button: "баттон",
  select: "селект", option: "опшн", table: "тейбл", tr: "ти-ар", td: "ти-ди", th: "ти-эйч",
  details: "дитейлс", summary: "саммари", dialog: "диалог", popover: "поповер", script: "скрипт",
  style: "стайл", aria: "ария", type: "тайп", tel: "тел", email: "имейл", required: "реквайрд",
  defer: "дифер", async: "эйсинк", viewport: "вьюпорт", lazy: "лейзи", loading: "лоадинг",
  tab: "таб", emmet: "эммет", devtools: "девтулз", vs: "ви-эс", code: "код", live: "лайв",
  server: "сервер", wi: "вай", fi: "фай", dns: "ди-эн-эс", ip: "ай-пи", url: "ю-эр-эль",
  svg: "эс-ви-джи", pdf: "пэ-дэ-эф", ok: "окей", coffee: "кофи", first: "фёрст", think: "синк",
  different: "дифферент", index: "индекс", doctype: "доктайп", lorem: "лорем", chrome: "хром",
  safari: "сафари", firefox: "файрфокс", google: "гугл", yandex: "яндекс", telegram: "телеграм",
  mdn: "эм-ди-эн", wcag: "дабл-ю-кэг", api: "эй-пи-ай", cdn: "си-ди-эн", xss: "икс-эс-эс",
  seo: "сео", og: "о-джи", json: "джейсон", ld: "эл-ди", f: "эф", ctrl: "контрол", s: "эс"
};
const LETTERS: Record<string, string> = {
  a: "эй", b: "би", c: "си", d: "ди", e: "и", f: "эф", g: "джи", h: "эйч", i: "ай", j: "джей", k: "кей",
  l: "эль", m: "эм", n: "эн", o: "оу", p: "пи", q: "кью", r: "ар", s: "эс", t: "ти", u: "ю", v: "ви",
  w: "дабл-ю", x: "икс", y: "уай", z: "зед"
};
const TRANSLIT: Record<string, string> = {
  a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "дж", k: "к", l: "л",
  m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс",
  y: "й", z: "з"
};

function sayLatin(word: string): string {
  const lower = word.toLowerCase();
  if (WORDS[lower]) return WORDS[lower]!;
  if (/^[a-z]+\d+$/.test(lower)) {
    const [, letters, digits] = /^([a-z]+)(\d+)$/.exec(lower)!;
    return `${sayLatin(letters!)} ${digits}`;
  }
  // Short or all-caps tokens are acronyms: spell them out; longer words are transliterated.
  if (lower.length <= 3 || (word === word.toUpperCase() && word.length <= 5))
    return [...lower].map((ch) => LETTERS[ch] ?? ch).join("-");
  return [...lower].map((ch) => TRANSLIT[ch] ?? ch).join("");
}

/** Code spans that are a bare symbol (Emmet cheatsheet) are named, not dropped. */
const SYMBOLS: Record<string, string> = {
  ">": "знак больше", "+": "плюс", "*": "звёздочка", "*3": "звёздочка три", ".": "точка", "#": "решётка",
  "[]": "квадратные скобки", "{}": "фигурные скобки", "$": "доллар", "!": "восклицательный знак"
};

/** Markdown-ish story text → plain Russian speech. */
export function spokenText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, (_, code: string) =>
      SYMBOLS[code.trim()] ??
      code
        .replace(/\.(?=[a-z])/gi, " точка ")
        .replace(/<\/?/g, " тег ")
        .replace(/[>"'=/]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .replace(/→/g, " — ")
    .replace(/№/g, "номер ")
    .replace(/[A-Za-z]+\d*/g, (word) => sayLatin(word))
    .replace(/\s+([,.!?…])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Stable 32-bit FNV-1a id of a line; names the pre-rendered clip file. */
export function lineId(who: string, text: string): string {
  let hash = 0x811c9dc5;
  for (const ch of `${who}|${text}`) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
