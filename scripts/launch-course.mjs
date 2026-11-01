#!/usr/bin/env node
// One-command launch of a course on a deployed Nexus (operator use only).
//
//   node scripts/launch-course.mjs [manifest] [--origin https://…] [--org-slug nexus] [--org-name Nexus]
//
// Steps, all idempotent (safe to re-run):
//   1. apply ordered migrations with the local platform_migrator checkpoint;
//   2. log in (or register) the owner account through the public API;
//   3. bootstrap the owner Organization with the trusted offline command;
//   4. import the manifest, publish it, create a public Offering, open self-entry.
//
// Credentials never leave this machine and are never printed. The migrator URL is
// read from .tmp/neon-bootstrap/credentials.json (created by db:bootstrap:neon) or
// from DATABASE_MIGRATION_URL.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args.splice(i, 2)[1] : fallback;
};
const ORIGIN = flag("--origin", "https://nexus-lake-nine-17.vercel.app").replace(/\/$/, "");
const ORG_SLUG = flag("--org-slug", "nexus");
const ORG_NAME = flag("--org-name", "Nexus");
const OFFERING_SLUG = flag("--offering-slug", null);
// --new-version publishes the manifest as the next version of an already published course and
// moves the existing public Offering forward to it (ADR-0062), keeping learners' Enrollments and
// progress. The stable address /courses/<course> never changes (ADR-0061).
const NEW_VERSION = args.includes("--new-version") ? (args.splice(args.indexOf("--new-version"), 1), true) : false;
const MANIFEST_PATH = args[0] ?? "docs/examples/html-track.manifest.json";

const step = (text) => console.log(`\n▸ ${text}`);
const ok = (text) => console.log(`  ✓ ${text}`);
const fail = (text) => {
  console.error(`\n✗ ${text}`);
  process.exit(1);
};

function migratorUrl() {
  if (process.env.DATABASE_MIGRATION_URL) return process.env.DATABASE_MIGRATION_URL;
  const file = ".tmp/neon-bootstrap/credentials.json";
  if (!existsSync(file)) fail(`Нет ${file} и DATABASE_MIGRATION_URL. Нужны реквизиты роли platform_migrator.`);
  return JSON.parse(readFileSync(file, "utf8")).urls.migrator;
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.startsWith(question)) rl.output.write(s);
        else if (s.includes("\n")) rl.output.write("\n");
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function run(command, commandArgs, env) {
  const result = spawnSync(command, commandArgs, { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...env }, encoding: "utf8" });
  return { status: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

let cookie = "";
async function api(method, path, body) {
  const headers = { accept: "application/json", origin: ORIGIN };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${ORIGIN}/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual"
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let data = null;
  try {
    data = await response.json();
  } catch {}
  return { status: response.status, ok: response.ok, data };
}
const must = async (label, promise) => {
  const response = await promise;
  if (!response.ok) fail(`${label}: HTTP ${response.status} ${JSON.stringify(response.data)?.slice(0, 300) ?? ""}`);
  return response.data;
};

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
console.log(`Запуск курса «${manifest.course.title}» на ${ORIGIN}`);

step("Проверяю, что продакшен отвечает");
const health = await fetch(`${ORIGIN}/v1/health`).catch(() => null);
if (!health?.ok) fail("API не отвечает на /v1/health. Дождитесь окончания деплоя Vercel.");
ok("API работает");

step("Накатываю миграции базы данных");
const DB = migratorUrl();
const migrate = run("pnpm", ["db:migrate"], { DATABASE_MIGRATION_URL: DB });
if (migrate.status !== 0) fail(`Миграции не применились:\n${migrate.out.replaceAll(DB, "[скрыто]")}`);
ok("Схема базы актуальна");

step("Вход владельца");
let auth = null;
// Non-interactive mode: OWNER_EMAIL and OWNER_PASSWORD from the environment.
const fromEnv = Boolean(process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD);
for (let tries = 0; tries < (fromEnv ? 1 : 5) && !auth?.ok; tries++) {
  const email = fromEnv ? process.env.OWNER_EMAIL : await ask("  Почта владельца: ");
  const password = fromEnv ? process.env.OWNER_PASSWORD : await ask("  Пароль (не меньше 15 символов): ", { hidden: true });
  if (password.length < 15) {
    console.log("  Пароль должен быть не короче 15 символов. Попробуйте ещё раз.");
    continue;
  }
  auth = await api("POST", "auth/login", { email, password });
  if (auth.status === 401) {
    auth = await api("POST", "auth/register", { email, password });
    if (auth.ok) console.log("  Создан новый аккаунт.");
    else if (auth.status === 409) {
      console.log("  Аккаунт с этой почтой уже есть, но пароль не подошёл.");
      console.log("  Введите правильный пароль или другую почту — для неё создадим новый аккаунт.");
    }
  }
  if (!auth.ok && auth.status !== 409) fail(`Не удалось войти: HTTP ${auth.status}`);
}
if (!auth?.ok) fail("Не удалось войти за 5 попыток.");
const me = await must("Чтение профиля", api("GET", "me"));
const ownerId = me.id ?? me.user?.id;
if (!ownerId) fail("API не вернул id пользователя.");
ok("Вход выполнен");

step(`Организация «${ORG_NAME}»`);
let orgs = (await must("Список организаций", api("GET", "me/organizations"))).organizations;
let org = orgs.find((o) => o.slug === ORG_SLUG);
if (!org) {
  const boot = run("pnpm", ["run", "org:bootstrap-owner", "--owner-user-id", ownerId, "--slug", ORG_SLUG, "--name", ORG_NAME, "--apply"], { DATABASE_MIGRATION_URL: DB });
  if (boot.status !== 0) fail(`Организация не создана:\n${boot.out.replaceAll(DB, "[скрыто]")}`);
  orgs = (await must("Список организаций", api("GET", "me/organizations"))).organizations;
  org = orgs.find((o) => o.slug === ORG_SLUG);
  if (!org) fail("Организация создана, но не видна владельцу.");
}
ok(`Организация готова (/${org.slug})`);
const orgPath = `organizations/${org.id}`;

step("Импорт курса");
const list = await must("Курсы Studio", api("GET", `${orgPath}/studio/courses`));
let summary = list.courses.find((c) => c.slug === manifest.course.slug);
const previousVersionId = summary?.status === "published" ? summary.versionId : null;
async function importAndPublish(courseIdHint) {
  const plan = await must("Проверка документа", api("POST", `${orgPath}/courses/manifest/validate`, manifest));
  const applied = await must("Сохранение черновика", api("POST", `${orgPath}/courses/manifest/apply`, {
    manifest,
    expectedDraftVersionId: plan.expectedDraftVersionId,
    expectedRevision: plan.expectedRevision
  }));
  const courseId = applied.courseId ?? plan.courseId ?? courseIdHint;
  const draft = await must("Чтение черновика", api("GET", `${orgPath}/studio/courses/${courseId}`));
  ok(`Черновик сохранён: ${plan.counts.lessons} уроков, ${plan.counts.activities} заданий`);
  await must("Публикация", api("POST", `${orgPath}/studio/courses/${courseId}/publish`, {
    draftVersionId: draft.versionId,
    expectedRevision: draft.revision
  }));
  ok(`Опубликована версия ${draft.versionNumber}`);
}
if (summary?.status === "published" && !NEW_VERSION) {
  ok(`Курс уже опубликован (версия ${summary.versionNumber}) — пропускаю импорт. Для обновления: --new-version`);
} else if (summary?.status === "published") {
  await must("Создание следующего черновика", api("POST", `${orgPath}/studio/courses/${summary.courseId}/draft`, {}));
  await importAndPublish(summary.courseId);
} else {
  await importAndPublish(summary?.courseId);
}
summary = (await must("Курсы Studio", api("GET", `${orgPath}/studio/courses`))).courses.find((c) => c.slug === manifest.course.slug);
const published = await must("Чтение курса", api("GET", `${orgPath}/studio/courses/${summary.courseId}`));

step("Публичный доступ");
// ADR-0062: a new version moves the existing public Offering forward, so learners keep their
// Enrollment and progress. A brand-new Offering is created only for the first publication or when
// the old one cannot move (for example, a cohort Offering).
let offering = null;
let offeringSlug = OFFERING_SLUG ?? manifest.course.slug;
if (previousVersionId && previousVersionId !== published.versionId) {
  const old = (await must("Текущие доступы", api("GET", `${orgPath}/offerings?courseVersionId=${previousVersionId}`))).offerings;
  for (const item of old.filter((o) => o.visibility === "public")) {
    const moved = await api("PATCH", `${orgPath}/offerings/${item.id}/course-version`, { courseVersionId: published.versionId });
    if (moved.ok && !offering) {
      offering = moved.data;
      offeringSlug = offering.slug;
      ok(`Доступ /${offering.slug} переведён на версию ${published.versionNumber} — ученики сохраняют прогресс`);
    } else if (!moved.ok) {
      await must("Скрытие старого доступа", api("PATCH", `${orgPath}/offerings/${item.id}/visibility`, { visibility: "private" }));
      ok(`Старый доступ /${item.slug} нельзя перевести (HTTP ${moved.status}) — скрыт`);
    }
  }
}
if (!offering) {
  offeringSlug = OFFERING_SLUG ?? (published.versionNumber > 1
    ? `${manifest.course.slug}-v${published.versionNumber}`
    : manifest.course.slug);
  const current = (await must("Список доступов", api("GET", `${orgPath}/offerings?courseVersionId=${published.versionId}`))).offerings;
  offering = current.find((o) => o.slug === offeringSlug) ?? await must("Создание доступа", api("POST", `${orgPath}/offerings`, {
    courseVersionId: published.versionId,
    name: manifest.course.title,
    slug: offeringSlug,
    deliveryMode: "self_paced",
    accessMode: "membership"
  }));
}
if (offering.visibility !== "public") {
  await must("Открытие доступа", api("PATCH", `${orgPath}/offerings/${offering.id}/visibility`, { visibility: "public" }));
}
ok("Курс виден всем");

step("Самостоятельное вступление учеников");
await must("Политика вступления", api("PUT", `${orgPath}/customer-entry-policy`, { policy: "open" }));
ok("Ученики начинают курс одной кнопкой");

// The site's own organization gets the stable course address; others keep the Offering address.
const url = org.slug === "nexus"
  ? `${ORIGIN}/courses/${manifest.course.slug}`
  : `${ORIGIN}/learn/${org.slug}/${offeringSlug}`;
const check = await fetch(`${ORIGIN}/v1/public/learning/${org.slug}/courses/${manifest.course.slug}`);
console.log(`\n${check.ok ? "Готово" : "Опубликовано, но публичная страница пока не отвечает"}:\n  Курс:   ${url}\n  Studio: ${ORIGIN}/studio\n`);
