// Builds ../js-track.manifest.json. Run from the repository root: node docs/examples/js-course/build.mjs
import { writeFileSync } from "node:fs";
import { createCourse } from "../html-course/lib.mjs";
import start from "./c01-start.mjs";
import values from "./c02-values.mjs";
import flow from "./c03-flow.mjs";
import functions from "./c04-functions.mjs";
import arrays from "./c05-arrays.mjs";
import objects from "./c06-objects.mjs";
import dom from "./c07-dom.mjs";
import events from "./c08-events.mjs";
import forms from "./c09-forms.mjs";
import asyncChapter from "./c10-async.mjs";
import final from "./c11-final.mjs";
import syntax from "./c12-syntax.mjs";
import objectsDeep from "./c13-objects-deep.mjs";
import strings from "./c14-strings.mjs";
import numbers from "./c15-numbers.mjs";

const chapters = [
  ["Старт JavaScript", [start]],
  ["Значения и операторы", [values]],
  ["Условия и циклы", [flow]],
  ["Функции", [functions]],
  ["Массивы", [arrays]],
  ["Объекты", [objects]],
  ["DOM", [dom]],
  ["События", [events]],
  ["Формы", [forms]],
  ["Асинхронность", [asyncChapter]],
  ["Хранение и финал", [final]],
  ["Синтаксис полностью", [syntax]],
  ["Объекты и функции изнутри", [objectsDeep]],
  ["Строки полностью", [strings]],
  ["Числа и Math полностью", [numbers]]
];

const challenges = {};
const recaps = {};
const course = createCourse(challenges, {}, recaps, {
  premise: "Курс-история: ты оживляешь сайт кофейни «Зерно»",
  cast: ["marta", "bro", "nika", "bug", "lev"]
});
for (const [chapter, parts] of chapters) {
  course.chapter(chapter);
  for (const part of parts) part(course, challenges, recaps);
}

const manifest = course.manifest({
  slug: "js",
  title: "JavaScript с нуля: живой сайт кофейни",
  description:
    "Курс-история: сайт кофейни «Зерно» красивый, но мёртвый — кнопки не нажимаются, корзина не считает. Вместе с наставницей Никой ты оживляешь его и побеждаешь Вредного Скрипта. Весь практический JavaScript — переменные, условия, функции, массивы и объекты, DOM и события, формы, асинхронность и fetch — с живыми примерами, консолью и заданиями с мгновенной проверкой прямо в браузере."
});
writeFileSync(new URL("../js-track.manifest.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} hours=${(minutes / 60).toFixed(1)}`);
