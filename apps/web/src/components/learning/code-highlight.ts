import { itemAt } from "../../lib/item-at";
/**
 * Tiny dependency-free syntax highlighter for lesson code. It only splits text into
 * classified tokens; rendering escapes everything (React text nodes), so author or
 * learner code can never become markup.
 */
export type TokenKind =
  | "plain" | "tag" | "attr" | "string" | "comment" | "punct"
  | "entity" | "doctype" | "keyword" | "number" | "property";
export type Token = { kind: TokenKind; text: string };

function push(tokens: Token[], kind: TokenKind, text: string) {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last?.kind === kind) last.text += text;
  else tokens.push({ kind, text });
}

function highlightText(tokens: Token[], text: string) {
  let last = 0;
  for (const match of text.matchAll(/&[#a-zA-Z0-9]+;/g)) {
    push(tokens, "plain", text.slice(last, match.index));
    push(tokens, "entity", match[0]);
    last = match.index + match[0].length;
  }
  push(tokens, "plain", text.slice(last));
}

export function highlightHtml(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < code.length) {
    if (code.startsWith("<!--", i)) {
      const end = code.indexOf("-->", i + 4);
      const stop = end < 0 ? code.length : end + 3;
      push(tokens, "comment", code.slice(i, stop));
      i = stop;
      continue;
    }
    if (code.startsWith("<!", i)) {
      const end = code.indexOf(">", i);
      const stop = end < 0 ? code.length : end + 1;
      push(tokens, "doctype", code.slice(i, stop));
      i = stop;
      continue;
    }
    const tag = /^<\/?([a-zA-Z][\w-]*)/.exec(code.slice(i));
    if (tag) {
      push(tokens, "punct", tag[0].startsWith("</") ? "</" : "<");
      push(tokens, "tag", itemAt(tag, 1));
      i += tag[0].length;
      // Attributes until the closing bracket.
      while (i < code.length && code[i] !== ">") {
        const rest = code.slice(i);
        const space = /^\s+/.exec(rest);
        if (space) { push(tokens, "plain", space[0]); i += space[0].length; continue; }
        if (rest.startsWith("/>")) break;
        const attr = /^[^\s=>/"']+/.exec(rest);
        if (attr) { push(tokens, "attr", attr[0]); i += attr[0].length; continue; }
        if (rest.startsWith("=")) {
          push(tokens, "punct", "=");
          i += 1;
          const value = /^("[^"]*"?|'[^']*'?|[^\s>]+)/.exec(code.slice(i));
          if (value) { push(tokens, "string", value[0]); i += value[0].length; }
          continue;
        }
        push(tokens, "plain", itemAt(rest, 0));
        i += 1;
      }
      if (code.startsWith("/>", i)) { push(tokens, "punct", "/>"); i += 2; }
      else if (code[i] === ">") {
        push(tokens, "punct", ">");
        i += 1;
        // Embedded stylesheets and scripts get their own highlighting.
        const name = itemAt(tag, 1).toLowerCase();
        if (!tag[0].startsWith("</") && (name === "style" || name === "script")) {
          const end = code.toLowerCase().indexOf(`</${name}`, i);
          const stop = end < 0 ? code.length : end;
          for (const t of highlightCode(code.slice(i, stop), name === "style" ? "css" : "js")) push(tokens, t.kind, t.text);
          i = stop;
        }
      }
      continue;
    }
    const next = code.indexOf("<", i + 1);
    const stop = next < 0 ? code.length : next;
    highlightText(tokens, code.slice(i, stop));
    i = stop;
  }
  return tokens;
}

const KEYWORDS = new Set(("const let var function return if else for while of in new class extends " +
  "import from export default async await true false null undefined this typeof try catch").split(" "));

/** Generic C-like highlighting for JavaScript, CSS and JSON. */
export function highlightCode(code: string, language: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?(?:px|rem|em|%|s|ms)?\b)|([A-Za-z_$][\w$-]*)|([{}()[\];:,.=<>+\-*/!&|?])/g;
  let last = 0;
  for (const m of code.matchAll(pattern)) {
    push(tokens, "plain", code.slice(last, m.index));
    const [text, comment, string, number, word] = m;
    if (comment) push(tokens, "comment", text);
    else if (string) {
      const isKey = language === "json" && /^\s*:/.test(code.slice(m.index + text.length));
      push(tokens, isKey ? "property" : "string", text);
    } else if (number) push(tokens, "number", text);
    else if (word) {
      const isProperty = language === "css" && /^\s*:/.test(code.slice(m.index + text.length));
      push(tokens, KEYWORDS.has(word) ? "keyword" : isProperty ? "property" : "plain", text);
    } else push(tokens, "punct", text);
    last = m.index + text.length;
  }
  push(tokens, "plain", code.slice(last));
  return tokens;
}

const SQL_KEYWORDS = new Set(("select from where and or not in is null like ilike between as distinct order by asc desc nulls first last " +
  "limit offset fetch next rows only group having join inner left right full outer cross on using natural union all intersect except " +
  "with recursive insert into values update set delete returning create table drop alter add column rename to primary key foreign " +
  "references unique check default constraint index view materialized if exists cascade restrict begin commit rollback savepoint " +
  "transaction case when then else end cast true false conflict do nothing over partition window range preceding following unbounded " +
  "current row explain analyze generated always identity lateral filter within any some grant revoke truncate interval date time " +
  "timestamp integer int bigint smallint numeric decimal real text varchar char boolean serial jsonb json array collate escape " +
  "temporary temp replace function returns language trigger for each execute vacuum").split(" "));

/** SQL: keywords in any case, strings, comments, numbers and function names. */
export function highlightSql(code: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /(--[^\n]*|\/\*[\s\S]*?\*\/)|('(?:''|[^'])*'?|\$\$[\s\S]*?(?:\$\$|$))|("(?:""|[^"])*"?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_\u0400-\u04FF][\w\u0400-\u04FF]*)|([(),;.*=<>!+\-/%|:[\]]+)/g;
  let last = 0;
  for (const m of code.matchAll(pattern)) {
    push(tokens, "plain", code.slice(last, m.index));
    const [text, comment, string, quoted, number, word] = m;
    if (comment) push(tokens, "comment", text);
    else if (string) push(tokens, "string", text);
    else if (quoted) push(tokens, "plain", text);
    else if (number) push(tokens, "number", text);
    else if (word) {
      const isFunction = /^\s*\(/.test(code.slice(m.index + text.length));
      push(tokens, SQL_KEYWORDS.has(word.toLowerCase()) ? "keyword" : isFunction ? "property" : "plain", text);
    } else push(tokens, "punct", text);
    last = m.index + text.length;
  }
  push(tokens, "plain", code.slice(last));
  return tokens;
}

export function highlight(code: string, language?: string): Token[] {
  const lang = (language ?? "").toLowerCase();
  if (lang === "sql" || lang === "pgsql" || lang === "postgresql") return highlightSql(code);
  if (lang === "html" || lang === "xml" || lang === "svg") return highlightHtml(code);
  if (["js", "javascript", "ts", "json", "css"].includes(lang)) return highlightCode(code, lang);
  return [{ kind: "plain", text: code }];
}
