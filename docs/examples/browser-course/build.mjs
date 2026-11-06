// Builds ../browser-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/browser-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";
import { browser, urls, dns } from "./b01-basics.mjs";
import { protocols, messages, statuses } from "./b02-http.mjs";
import { caching, storage, tabs, extensions, privacy } from "./b03-state.mjs";
import { rendering, devtools } from "./b04-render.mjs";
import { accessibility, responsive } from "./b05-a11y-responsive.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Браузер.
const chapters = [
  ["Что такое браузер", browser],
  ["Адрес страницы", urls],
  ["DNS", dns],
  ["HTTP и HTTPS", protocols],
  ["Запросы и ответы", messages],
  ["Коды ответа", statuses],
  ["Кэширование", caching],
  ["Cookies и хранилища", storage],
  ["Вкладки и история", tabs],
  ["Расширения", extensions],
  ["Приватность и безопасность", privacy],
  ["Как браузер рисует страницу", rendering],
  ["Инструменты разработчика", devtools],
  ["Дерево доступности", accessibility],
  ["Адаптивный режим", responsive]
];

await buildCourse({
  createCourse,
  chapters,
  cast: ["bro", "nika"],
  out: new URL("../browser-track.manifest.json", import.meta.url),
  course: {
    slug: "browser",
    title: "Браузер изнутри: от адреса до страницы",
    description:
      "Как работает браузер — от адресной строки до готовой страницы. Адреса и DNS, HTTP и HTTPS, запросы, ответы и коды, кэш, cookies и хранилища, вкладки и история, расширения, приватность и безопасность, отрисовка страницы, все панели инструментов разработчика, дерево доступности и адаптивный режим. Каждое понятие — карточка, примеры запускаются прямо в браузере, каждый урок закрепляется вопросами."
  }
});
