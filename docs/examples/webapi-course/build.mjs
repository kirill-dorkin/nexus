// Builds ../webapi-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/webapi-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Web API.
const chapters = [
  ["Что такое Web API", "a01-intro.mjs"],
  ["DOM глубже", "a02-dom.mjs"],
  ["Сеть из браузера", "a03-fetch.mjs"],
  ["Хранилища браузера", "a04-storage.mjs"],
  ["Работа в фоне", "a05-workers.mjs"],
  ["Медиа и графика", "a06-media.mjs"],
  ["Устройства и датчики", "a07-devices.mjs"],
  ["Наблюдатели", "a08-observers.mjs"],
  ["Связь в реальном времени", "a09-realtime.mjs"],
  ["Безопасность и разрешения", "a10-security.mjs"],
  ["Web API на практике", "a11-practice.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../webapi-track.manifest.json", import.meta.url),
  course: {
    slug: "webapi",
    title: "Web API: возможности браузера",
    description:
      "Что умеет браузер помимо страниц. DOM и события глубже, fetch, потоки и отмена запросов, localStorage, IndexedDB и Cache, Web Workers и Service Worker, офлайн-режим и уведомления, Canvas, аудио и видео, камера, геолокация и буфер обмена, IntersectionObserver и ResizeObserver, WebSocket и WebRTC, разрешения и безопасность, прогрессивные веб-приложения. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
