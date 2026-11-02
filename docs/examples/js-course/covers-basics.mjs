// Which spec-index items the cards of the first eleven chapters cover (by card name).
// New chapters pass `covers` inline; see spec-index.json and the contracts test.
const ap = (...m) => m.map((x) => `Array.prototype.${x}`);
const sp = (...m) => m.map((x) => `String.prototype.${x}`);
export const BASIC_COVERS = {
  "let": ["let"], "const": ["const"], "=": ["="], "var": ["var"], "typeof": ["typeof"], "undefined": ["undefined"],
  "boolean": ["Boolean"], "SyntaxError": ["SyntaxError"], "ReferenceError": ["ReferenceError"], "TypeError": ["TypeError"],
  "+ − * /": ["+ - * /"], "%": ["%"], "**": ["**"], "+=": ["+= -= *= /= %= **="], "++ --": ["++ --"],
  "`…${}…`": ["`шаблон ${}`"], "str.length": sp("length"), "toUpperCase() · toLowerCase()": sp("toUpperCase", "toLowerCase"),
  "str.includes()": sp("includes"), "str.slice()": sp("slice"), "trim()": sp("trim"), "split()": sp("split"),
  "replace() · replaceAll()": sp("replace", "replaceAll"), "===": ["=== !=="], "> < >= <=": ["< > <= >="], "==": ["== !="],
  "&&": ["&&"], "||": ["||"], "!": ["!"], "??": ["??"], "?.": ["?."], "Number()": ["Number"], "String()": ["String"],
  "parseInt() · parseFloat()": ["parseInt", "parseFloat"], "NaN": ["NaN", "Number.isNaN"], "toFixed()": ["Number.prototype.toFixed"],
  "Math.round()": ["Math.round", "Math.floor", "Math.ceil"], "if": ["if…else"], "Блок { }": ["блок { }"], "? :": ["?:"],
  "switch": ["switch"], "for": ["for"], "while": ["while"], "for…of": ["for…of"], "continue": ["continue"], "break": ["break"],
  "do…while": ["do…while"], "function": ["function"], "return": ["return"], "Параметр по умолчанию": ["значения по умолчанию"],
  "...rest": ["...rest"], "=>": ["=>"], "Замыкание": ["замыкание"], "[ ]": ["Array"], "push() · pop()": ap("push", "pop"),
  "unshift() · shift()": ap("unshift", "shift"), "indexOf()": ap("indexOf"), "arr.includes()": ap("includes"),
  "forEach()": ap("forEach"), "map()": ap("map"), "filter()": ap("filter"), "find()": ap("find"), "findIndex()": ap("findIndex"),
  "some()": ap("some"), "every()": ap("every"), "reduce()": ap("reduce"), "sort()": ap("sort"), "toSorted()": ap("toSorted"),
  "arr.slice()": ap("slice"), "splice()": ap("splice"), "join()": ap("join"), "reverse() · concat()": ap("reverse", "concat"),
  "[a, b] =": ["деструктуризация массива"], "{ a, b } =": ["деструктуризация объекта"], "...": ["...spread"], "{ }": ["Object"],
  "obj.key": ["obj.prop · obj[expr]"], "delete": ["delete"], "in": ["in"], "this": ["this"],
  "Object.keys()": ["Object.keys"], "Object.values()": ["Object.values"], "Object.entries()": ["Object.entries"],
  "Object.fromEntries()": ["Object.fromEntries"], "for…in": ["for…in"], "JSON": ["JSON"], "JSON.stringify()": ["JSON.stringify"],
  "JSON.parse()": ["JSON.parse"], "class": ["class"], "new": ["new"], "extends · super": ["extends", "super"], "get": ["get · set"],
  "Promise": ["Promise"], "then()": ["Promise.prototype.then"], "catch()": ["Promise.prototype.catch"],
  "finally()": ["Promise.prototype.finally"], "Promise.all()": ["Promise.all"], "async": ["async function"], "await": ["await"],
  "try…catch": ["try…catch…finally"], "throw": ["throw"], "Date": ["Date"], "getHours() · getDay()": ["Date.prototype.getHours", "Date.prototype.getDay"],
  "Intl.NumberFormat": ["Intl.NumberFormat", "Intl.NumberFormat.prototype.format"],
  "Intl.DateTimeFormat": ["Intl.DateTimeFormat", "Intl.DateTimeFormat.prototype.format"], "Math.random()": ["Math.random"],
  "Math.min() · Math.max()": ["Math.min", "Math.max"], "Math.abs()": ["Math.abs"], "export": ["export"], "import": ["import"],
  "debugger": ["debugger"]
};
