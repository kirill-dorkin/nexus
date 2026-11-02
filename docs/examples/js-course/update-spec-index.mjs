// Snapshot of everything the JavaScript course must teach: the ECMAScript 2025 syntax (listed by
// hand below) and every standard built-in global with its static and prototype members, read from
// the running engine. Run with a current Node: node docs/examples/js-course/update-spec-index.mjs
import { writeFileSync } from "node:fs";

// Standard globals (ECMA-262 + ECMA-402 Intl), nothing host-specific.
const GLOBALS = [
  "globalThis", "Infinity", "NaN", "undefined", "eval", "isFinite", "isNaN", "parseFloat", "parseInt",
  "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent",
  "AggregateError", "Array", "ArrayBuffer", "BigInt", "BigInt64Array", "BigUint64Array", "Boolean", "DataView",
  "Date", "Error", "EvalError", "FinalizationRegistry", "Float16Array", "Float32Array", "Float64Array", "Function",
  "Int8Array", "Int16Array", "Int32Array", "Iterator", "Map", "Number", "Object", "Promise", "Proxy", "RangeError",
  "ReferenceError", "RegExp", "Set", "SharedArrayBuffer", "String", "Symbol", "SyntaxError", "TypeError",
  "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array", "URIError", "WeakMap", "WeakRef", "WeakSet",
  "Atomics", "JSON", "Math", "Reflect", "DisposableStack", "AsyncDisposableStack", "SuppressedError"
];
const TYPED = ["BigInt64Array", "BigUint64Array", "Float16Array", "Float32Array", "Float64Array", "Int8Array", "Int16Array", "Int32Array", "Uint8Array", "Uint8ClampedArray", "Uint16Array", "Uint32Array"];
const ERRORS = ["AggregateError", "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError", "SuppressedError"];

// Annex B (web-compatibility legacy): taught together in the legacy lesson.
const LEGACY = new Set([
  "escape", "unescape", "String.prototype.substr", "String.prototype.trimLeft", "String.prototype.trimRight",
  ...["anchor", "big", "blink", "bold", "fixed", "fontcolor", "fontsize", "italics", "link", "small", "strike", "sub", "sup"].map((m) => `String.prototype.${m}`),
  "Date.prototype.getYear", "Date.prototype.setYear", "Date.prototype.toGMTString", "RegExp.prototype.compile",
  "Object.prototype.__proto__", "Object.prototype.__defineGetter__", "Object.prototype.__defineSetter__",
  "Object.prototype.__lookupGetter__", "Object.prototype.__lookupSetter__",
  "Function.prototype.arguments", "Function.prototype.caller"
]);
// Engine extensions that are not part of the standard.
const NON_STANDARD = /^(Error\.(captureStackTrace|stackTraceLimit|prepareStackTrace)|Intl\.v8BreakIterator|RegExp\.(\$.*|input|lastMatch|lastParen|leftContext|rightContext))$/;

const SKIP_STATIC = new Set(["length", "name", "prototype", "arguments", "caller"]);
const key = (k) => (typeof k === "symbol" ? `[${String(k).slice(7, -1)}]` : `.${k}`);
const builtins = new Set();
// Well-known symbol hooks on prototypes ([Symbol.iterator], [Symbol.toStringTag], …) are taught once,
// through the Symbol.* cards; the services every Intl constructor shares are taught once as well.
const add = (name) => {
  if (NON_STANDARD.test(name) || /\.?\[Symbol\.[A-Za-z]+\]$/.test(name)) return;
  if (/^Intl\.\w+\.(supportedLocalesOf|prototype\.resolvedOptions)$/.test(name)) {
    builtins.add(name.endsWith("supportedLocalesOf") ? "Intl.*.supportedLocalesOf" : "Intl.*.prototype.resolvedOptions");
    return;
  }
  builtins.add(name);
};

function members(owner, value, { statics = true, proto = true } = {}) {
  if (statics) for (const k of Reflect.ownKeys(value)) if (!(typeof value === "function" && SKIP_STATIC.has(k))) add(owner + key(k));
  if (proto && typeof value === "function" && value.prototype)
    for (const k of Reflect.ownKeys(value.prototype)) if (k !== "constructor") add(`${owner}.prototype${key(k)}`);
}

for (const name of GLOBALS) {
  if (!(name in globalThis)) continue;
  add(name);
  const value = globalThis[name];
  if (name === "globalThis" || value === null || (typeof value !== "object" && typeof value !== "function")) continue;
  if (TYPED.includes(name)) continue;
  if (ERRORS.includes(name)) continue;
  members(name, value);
}
// Shared prototypes that have no global name.
const TypedArray = Object.getPrototypeOf(Int8Array);
members("TypedArray", TypedArray);
add("TypedArray.BYTES_PER_ELEMENT");
for (const [owner, proto] of [
  ["Generator", Object.getPrototypeOf(function* () {}).prototype],
  ["AsyncGenerator", Object.getPrototypeOf(async function* () {}).prototype]
]) for (const k of Reflect.ownKeys(proto)) if (k !== "constructor" && typeof k !== "symbol") add(`${owner}.prototype.${k}`);
add("Error.prototype.message"); add("Error.prototype.name"); add("Error.prototype.toString"); add("Error.prototype.cause");
// ECMA-402: every Intl service with its members.
for (const k of Reflect.ownKeys(Intl)) {
  const value = Intl[k];
  add(`Intl${key(k)}`);
  if (typeof value === "function" && !NON_STANDARD.test(`Intl.${String(k)}`)) members(`Intl.${String(k)}`, value);
}

const legacy = [...builtins].filter((n) => LEGACY.has(n)).sort();
const standard = [...builtins].filter((n) => !LEGACY.has(n)).sort();

// The language itself: declarations, statements, operators, literals and core concepts.
const syntax = [
  "var", "let", "const", "function", "function*", "async function", "async function*", "class", "import", "export",
  "import()", "import.meta", "export default", "import * as", "using", "await using",
  "if…else", "switch", "for", "for…in", "for…of", "for await…of", "while", "do…while", "break", "continue", "label:",
  "return", "throw", "try…catch…finally", "catch без параметра", "debugger", "with", "блок { }", "пустая инструкция ;",
  "+ - * /", "%", "**", "++ --", "унарный + -", "!", "~", "typeof", "void", "delete", "await", "yield", "yield*",
  "== !=", "=== !==", "< > <= >=", "instanceof", "in", "&&", "||", "??", "?:", "=", "+= -= *= /= %= **=",
  "<<= >>= >>>= &= |= ^=", "&&= ||= ??=", "& | ^", "<< >> >>>", ", (запятая)", "...spread", "...rest", "?.",
  "new", "new.target", "super", "this", "( ) группировка", "obj.prop · obj[expr]", "=>", "`шаблон ${}`", "тег`шаблон`",
  "деструктуризация массива", "деструктуризация объекта", "значения по умолчанию", "вычисляемые ключи [expr]", "сокращённые методы",
  "extends", "static", "#приватное", "get · set", "static { }", "поля класса", "accessor-свойства объекта",
  "0x 0o 0b", "1_000_000", "123n", "1e3", "/регулярка/флаги", "\\u{…} и экранирование", "дырки в массиве",
  "\"use strict\"", "всплытие (hoisting)", "временная мёртвая зона", "замыкание", "цепочка прототипов",
  "цикл событий", "микрозадачи", "сборка мусора", "автоматическая точка с запятой", "SameValueZero",
  "протокол итераторов", "протокол асинхронных итераторов", "ссылка и значение", "примитивы", "приведение типов"
];

writeFileSync(new URL("./spec-index.json", import.meta.url), JSON.stringify({
  note: "Everything the JavaScript course teaches: ECMAScript 2025 syntax and every standard built-in member. Each item must be covered by exactly one concept card (its `covers`). Refresh: node docs/examples/js-course/update-spec-index.mjs",
  engine: `node ${process.version}`,
  syntax, builtins: standard, legacy
}, null, 2) + "\n");
console.log(`syntax=${syntax.length} builtins=${standard.length} legacy=${legacy.length}`);
