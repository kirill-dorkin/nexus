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
import arraysDeep from "./c16-arrays-deep.mjs";
import collections from "./c17-collections.mjs";
import regexp from "./c18-regexp.mjs";
import meta from "./c19-meta.mjs";
import errorsAsync from "./c20-errors-async.mjs";
import dates from "./c21-dates.mjs";
import intl from "./c22-intl.mjs";
import binary from "./c23-binary.mjs";
import legacy from "./c24-legacy.mjs";

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
  ["Числа и Math полностью", [numbers]],
  ["Массивы и итераторы полностью", [arraysDeep]],
  ["Коллекции", [collections]],
  ["Регулярные выражения", [regexp]],
  ["Symbol, Proxy и Reflect", [meta]],
  ["Ошибки, ресурсы и промисы", [errorsAsync]],
  ["Даты полностью", [dates]],
  ["Intl полностью", [intl]],
  ["Бинарные данные и общая память", [binary]],
  ["Устаревшее: как читать старый код", [legacy]]
];

const challenges = {};
const recaps = {};
const course = createCourse(challenges, {}, recaps);
for (const [chapter, parts] of chapters) {
  course.chapter(chapter);
  for (const part of parts) part(course, challenges, recaps);
}

const manifest = course.manifest({
  slug: "js",
  title: "JavaScript с нуля",
  description:
    "Весь JavaScript — от первой строки до каждой возможности языка. Первая часть учит программировать: переменные, условия, функции, массивы и объекты, DOM и события, формы, асинхронность и fetch. Вторая — разбирает язык целиком: синтаксис, все встроенные объекты и их методы, регулярные выражения, Intl, бинарные данные. Каждая конструкция — карточка с живым примером, каждое задание проверяется прямо в браузере."
});

// The lesson banner names only the characters who actually speak in that lesson.
const FENCE = "```";
for (const lesson of manifest.lessons) {
  const cast = new Set();
  for (const block of lesson.blocks) {
    if (block.type !== "markdown") continue;
    for (const [, body] of block.markdown.matchAll(new RegExp(FENCE + "story\\n([\\s\\S]*?)\\n" + FENCE, "g")))
      for (const [who] of JSON.parse(body).lines) if (who !== "you") cast.add(who);
  }
  const list = cast.size ? [...cast] : ["bro", "nika"];
  for (const block of lesson.blocks) {
    if (block.type !== "markdown") continue;
    block.markdown = block.markdown.replace(new RegExp(FENCE + "recap\\n(.*)\\n" + FENCE), (_, json) =>
      `${FENCE}recap\n${JSON.stringify({ ...JSON.parse(json), cast: list })}\n${FENCE}`);
  }
}
writeFileSync(new URL("../js-track.manifest.json", import.meta.url), JSON.stringify(manifest, null, 2) + "\n");
const minutes = manifest.lessons.reduce((sum, l) => sum + l.durationMinutes, 0);
console.log(`lessons=${manifest.lessons.length} activities=${manifest.activities.length} hours=${(minutes / 60).toFixed(1)}`);
