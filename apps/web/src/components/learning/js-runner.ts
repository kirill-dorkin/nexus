import { itemAt } from "../../lib/item-at";
/*
 * Runnable JavaScript practice (ADR-0064). Builds the srcdoc of an opaque-origin iframe
 * (sandbox="allow-scripts", never allow-same-origin) that runs the learner's code:
 *   - a CSP meta tag closes the network, so the page cannot load or send anything;
 *   - a prelude captures console output and errors, offers `wait(ms)`, an offline
 *     teaching API for fetch() lessons (`/api/products`, `/api/users`, `/api/todos`, `/api/orders`) and, because an opaque origin
 *     has no Web Storage, an in-memory localStorage/sessionStorage that lives as long as the run;
 *   - loops are guarded, so a half-typed `while` cannot freeze the tab;
 *   - in "preview" mode the console is drawn under the page and the frame reports its height;
 *   - in "check" mode, after the page has loaded, author-written expressions are evaluated
 *     and the results are posted to the parent.
 * Practice only: official progress still comes from server-graded activities.
 */

export type RunMode = "preview" | "check";
export type LogLine = { level: "log" | "info" | "warn" | "error"; text: string };
export type RunCheck = { js?: string | undefined; log?: string | undefined };
export type RunnerMessage =
  | { runnerToken: string; type: "result"; results: boolean[]; logs: LogLine[] }
  | { runnerToken: string; type: "size"; height: number };

export const PRODUCTS_FIXTURE = [
  { id: 1, title: "Наушники", price: 3490, category: "audio", inStock: true },
  { id: 2, title: "Клавиатура", price: 4990, category: "input", inStock: true },
  { id: 3, title: "Мышь", price: 1290, category: "input", inStock: true },
  { id: 4, title: "Монитор", price: 15990, category: "screen", inStock: false },
  { id: 5, title: "Колонка", price: 2790, category: "audio", inStock: true },
  { id: 6, title: "Веб-камера", price: 3290, category: "video", inStock: true }
];
export const USERS_FIXTURE = [
  { id: 1, name: "Аня", email: "anya@example.com", city: "Казань" },
  { id: 2, name: "Борис", email: "boris@example.com", city: "Пермь" },
  { id: 3, name: "Вера", email: "vera@example.com", city: "Томск" }
];
export const TODOS_FIXTURE = [
  { id: 1, title: "Повторить массивы", done: true },
  { id: 2, title: "Сделать викторину", done: false },
  { id: 3, title: "Прочитать про fetch", done: false }
];
/** The first course version taught fetch() on a café menu; kept until no published version uses it. */
const LEGACY_MENU_FIXTURE = [
  { id: 1, name: "Эспрессо", price: 150, category: "coffee", popular: false },
  { id: 2, name: "Капучино", price: 210, category: "coffee", popular: true },
  { id: 3, name: "Латте", price: 220, category: "coffee", popular: true },
  { id: 4, name: "Раф", price: 290, category: "coffee", popular: false },
  { id: 5, name: "Какао", price: 190, category: "other", popular: false },
  { id: 6, name: "Чизкейк", price: 260, category: "dessert", popular: true }
];

const LOOP_LIMIT_MS = 1500;

/**
 * Inserts a time guard at the start of every braced `for`, `while` and `do` body.
 * Strings, template literals and comments are skipped; regular-expression literals are rare in
 * teaching code and only risk a missed guard, never broken code.
 */
export function guardLoops(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;
  const word = (at: number) => /[A-Za-z0-9_$]/.test(code[at] ?? "");
  while (i < n) {
    const ch = itemAt(code, i);
    if (ch === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      out += code.slice(i, stop); i = stop; continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      out += code.slice(i, stop); i = stop; continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < n && code[j] !== ch) j += code[j] === "\\" ? 2 : 1;
      out += code.slice(i, j + 1); i = j + 1; continue;
    }
    const keyword = !word(i - 1) && (code.startsWith("for", i) && !word(i + 3) ? "for"
      : code.startsWith("while", i) && !word(i + 5) ? "while"
      : code.startsWith("do", i) && !word(i + 2) ? "do" : null);
    if (keyword) {
      let j = i + keyword.length;
      if (keyword !== "do") {
        while (j < n && /\s/.test(itemAt(code, j))) j++;
        if (code[j] === "(") {
          let depth = 0;
          for (; j < n; j++) {
            if (code[j] === "(") depth++;
            else if (code[j] === ")" && --depth === 0) { j++; break; }
          }
        }
      }
      let k = j;
      while (k < n && /\s/.test(itemAt(code, k))) k++;
      if (code[k] === "{") {
        out += code.slice(i, k + 1) + "if(__loopGuard())break;";
        i = k + 1; continue;
      }
      out += code.slice(i, j); i = j; continue;
    }
    out += ch; i++;
  }
  return out;
}

const scriptText = (code: string) => code.replace(/<\/(script)/gi, "<\\/$1");

function prelude(token: string, mode: RunMode): string {
  return `(function(){
var T=${JSON.stringify(token)},MODE=${JSON.stringify(mode)},logs=[],burst=0;
window.__runnerLogs=logs;
// Time is measured per synchronous task: the reset timer only fires once the task yields,
// so a loop that never yields trips the guard while loops in later handlers start fresh.
window.__loopGuard=function(){var now=Date.now();if(!burst){burst=now;setTimeout(function(){burst=0},0);}
if(now-burst>${LOOP_LIMIT_MS}){burst=0;throw new RangeError("Цикл работает слишком долго — похоже, он бесконечный");}return false;};
function fmt(v,d){d=d||0;
if(typeof v==="string")return d?JSON.stringify(v):v;
if(v===undefined)return "undefined";if(v===null)return "null";
if(typeof v==="function")return "ƒ "+(v.name||"")+"()";
if(v instanceof Error)return v.name+": "+v.message;
if(typeof Element!=="undefined"&&v instanceof Element)return "<"+v.tagName.toLowerCase()+">";
if(Array.isArray(v))return d>2?"[…]":"["+v.map(function(x){return fmt(x,d+1)}).join(", ")+"]";
if(typeof v==="object"){if(d>2)return "{…}";try{var k=Object.keys(v);return k.length?"{ "+k.map(function(key){return key+": "+fmt(v[key],d+1)}).join(", ")+" }":"{}"}catch(e){return String(v)}}
return String(v);}
function push(level,text){if(logs.length<200)logs.push({level:level,text:text});if(MODE==="preview")schedule();}
["log","info","warn","error","table"].forEach(function(level){console[level]=function(){var text=[].map.call(arguments,function(a){return fmt(a,0)}).join(" ");push(level==="table"?"log":level,text);};});
addEventListener("error",function(e){push("error",e.message?String(e.message).replace(/^Uncaught /,""):"Ошибка в коде");});
addEventListener("unhandledrejection",function(e){push("error","Ошибка в промисе: "+fmt(e.reason,0));});
window.wait=function(ms){return new Promise(function(r){setTimeout(r,ms)})};
function memoryStorage(){var data={};return{get length(){return Object.keys(data).length},key:function(i){return Object.keys(data)[i]??null},getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null},setItem:function(k,v){data[String(k)]=String(v)},removeItem:function(k){delete data[String(k)]},clear:function(){data={}}};}
["localStorage","sessionStorage"].forEach(function(name){try{window[name].getItem("x")}catch(e){try{Object.defineProperty(window,name,{value:memoryStorage(),configurable:true})}catch(e2){}}});
var DATA={"/api/products":${JSON.stringify(PRODUCTS_FIXTURE)},"/api/users":${JSON.stringify(USERS_FIXTURE)},"/api/todos":${JSON.stringify(TODOS_FIXTURE)},"/api/menu":${JSON.stringify(LEGACY_MENU_FIXTURE)}};
function reply(status,body){return wait(80).then(function(){return new Response(JSON.stringify(body),{status:status,headers:{"Content-Type":"application/json"}})});}
window.fetch=function(input,init){
var url=String(input&&input.url||input).replace(/^https?:\\/\\/[^/]+/,"");var method=String(init&&init.method||"GET").toUpperCase();
var path=url.split("?")[0];
if(method==="GET"&&DATA[path])return reply(200,DATA[path]);
var m=path.match(/^(\\/api\\/\\w+)\\/(\\d+)$/);if(method==="GET"&&m&&DATA[m[1]]){var item=DATA[m[1]].filter(function(x){return x.id===Number(m[2])})[0];return item?reply(200,item):reply(404,{error:"Не найдено"});}
if(method==="POST"&&(path==="/api/orders"||path==="/api/todos")){var body={};try{body=JSON.parse(init.body||"{}")}catch(e){return reply(400,{error:"Тело запроса — не JSON"})}return reply(201,Object.assign({id:path==="/api/orders"?1042:101},path==="/api/orders"?{status:"accepted"}:{done:false},body));}
return reply(404,{error:"Не найдено"});};
var pending=false;function schedule(){if(pending)return;pending=true;setTimeout(function(){pending=false;render();},0);}
function render(){if(!document.body)return;var box=document.getElementById("__runner-console");
if(!logs.length){if(box)box.remove();size();return;}
if(!box){box=document.createElement("runner-console");box.id="__runner-console";box.setAttribute("style","all:initial;display:block;margin-top:8px;border-top:1px solid #3a2a20;background:#1b1410;color:#f5e6d3;font:12px/1.5 ui-monospace,Menlo,monospace;padding:6px 10px;white-space:pre-wrap;word-break:break-word");document.documentElement.appendChild(box);}
box.textContent="";var head=document.createElement("div");head.setAttribute("style","all:initial;display:block;color:#a8927f;font:11px/1.6 ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:.06em");head.textContent="Консоль";box.appendChild(head);
logs.forEach(function(l){var row=document.createElement("div");row.setAttribute("style","all:initial;display:block;font:inherit;white-space:pre-wrap;color:"+(l.level==="error"?"#fca5a5":l.level==="warn"?"#fcd34d":"#f5e6d3"));row.textContent=(l.level==="error"?"✖ ":l.level==="warn"?"⚠ ":"› ")+l.text;box.appendChild(row);});size();}
function size(){if(MODE!=="preview")return;var h=Math.max(document.documentElement.scrollHeight,document.body?document.body.scrollHeight:0);parent.postMessage({runnerToken:T,type:"size",height:h},"*");}
addEventListener("load",function(){render();size();});
})();`;
}

function checker(token: string, checks: RunCheck[]): string {
  const steps = checks.map((check) => check.js !== undefined
    ? `try{__r.push(!!(await (async()=>(${check.js}))()))}catch(__e){__r.push(false)}`
    : `__r.push(__has(${JSON.stringify(check.log ?? "")}))`);
  return `addEventListener("load",function(){setTimeout(async function(){
// Internal names start with __ so they never shadow the learner's own globals in check expressions.
var __logs=window.__runnerLogs||[];var __norm=function(s){return String(s).replace(/\\s+/g," ").trim().toLowerCase()};
var __has=function(t){t=__norm(t);return __logs.some(function(l){return l.level!=="error"&&__norm(l.text).indexOf(t)!==-1})};
var __r=[];${steps.join("\n")}
parent.postMessage({runnerToken:${JSON.stringify(token)},type:"result",results:__r,logs:__logs.slice()},"*");},60);});`;
}

const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data:; font-src data:">`;

/**
 * `module: true` runs JavaScript as a module, so examples may use top-level `await`. Concept cards
 * use it; challenges do not, because their checks read the learner's top-level bindings.
 */
export function runnerDocument({ code, lang = "html", page = "", mode, token, checks = [], module = false }: {
  code: string; lang?: "html" | "js" | undefined; page?: string | undefined; mode: RunMode; token: string; checks?: RunCheck[]; module?: boolean;
}): string {
  const head = `${CSP}<meta charset="utf-8"><script>${prelude(token, mode)}</script>`;
  const tail = mode === "check" ? `<script>${checker(token, checks)}</script>` : "";
  if (lang === "js") {
    return `<!doctype html><html><head>${head}<style>body{font:15px/1.5 system-ui,sans-serif;margin:8px;color:#2b1d14}</style></head><body>${page}<script${module ? ' type="module"' : ""}>${scriptText(guardLoops(code))}</script>${tail}</body></html>`;
  }
  const guarded = code.replace(/(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, open: string, body: string, close: string) => open + guardLoops(body) + close);
  const withHead = /<head[^>]*>/i.test(guarded) ? guarded.replace(/<head[^>]*>/i, (m) => m + head) : head + guarded;
  return withHead + tail;
}

/** Examples run as modules only when they need top-level `await`; everything else stays a classic script. */
export const needsModule = (code: string) => /\bawait\b/.test(code);

export function isRunnerMessage(data: unknown, token: string): data is RunnerMessage {
  return !!data && typeof data === "object" && (data as { runnerToken?: unknown }).runnerToken === token;
}
