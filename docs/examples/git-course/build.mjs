// Builds ../git-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/git-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Git.
const chapters = [
  ["Старт Git", "g01-start.mjs"],
  ["Снимки и коммиты", "g02-commits.mjs"],
  ["История и различия", "g03-history.mjs"],
  ["Отмена изменений", "g04-undo.mjs"],
  ["Ветки и слияние", "g05-branches.mjs"],
  ["Конфликты", "g06-conflicts.mjs"],
  ["Удалённые репозитории", "g07-remotes.mjs"],
  ["Командная работа на GitHub", "g08-github.mjs"],
  ["Rebase и чистая история", "g09-rebase.mjs"],
  ["Настройки, stash и .gitignore", "g10-config.mjs"],
  ["Как Git устроен внутри", "g11-internals.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../git-track.manifest.json", import.meta.url),
  course: {
    slug: "git",
    title: "Git: история кода и командная работа",
    description:
      "Git так, как им пользуются в командах. Репозиторий и первые коммиты, индекс и хорошие сообщения, история и различия, отмена любых изменений, ветки и слияние, разрешение конфликтов, удалённые репозитории и GitHub, pull request и ревью, rebase и чистая история, stash и .gitignore и то, как Git устроен внутри. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
