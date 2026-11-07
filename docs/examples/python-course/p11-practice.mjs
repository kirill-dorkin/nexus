// Chapter 11: Python in practice — HTTP requests, automation scripts, tests, project structure.
import { py, cmd, idea, tip, makeLesson } from "./pykit.mjs";

export default function practice(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi } = c;

  L({
    slug: "http-requests", title: "Запросы к API", summary: "Пакет requests, GET и POST, JSON-ответ, коды статуса, таймауты.",
    skill: ["py-http", "HTTP из Python", "Получать и отправлять данные по HTTP из Python."],
    now: "Пишем надёжный код и подключаем программу к сети.",
    body: [
      py("requests.get", "Получить данные", "`requests.get(url, timeout=10)` отправляет запрос, `r.json()` разбирает ответ.", "Курсы валют, погода, данные своего сервера — всё через API.", "import requests\n\nr = requests.get(\"https://api.example.com/courses\", timeout=10)\nr.raise_for_status()\nfor course in r.json():\n    print(course[\"title\"])"),
      py("raise_for_status", "Проверить ответ", "Код 200 — успех, 4xx — ошибка запроса, 5xx — ошибка сервера. `r.raise_for_status()` выбросит исключение при ошибке.", "Иначе программа молча обработает страницу ошибки как данные."),
      py("requests.post", "Отправить данные", "`requests.post(url, json=data, timeout=10)` — отправить JSON.", "Создать запись, отправить форму, вызвать бота."),
      idea("Таймаут", "Всегда указывай timeout", "Без timeout запрос может висеть вечно, если сервер не отвечает.", "Скрипт не зависнет на ночь."),
      tip("Всегда timeout и raise_for_status. Ответ — r.json().")
    ],
    quizzes: [
      single("hr-timeout", "Таймаут", "Почему важно указывать timeout в requests?",
        [["hang", "Без него запрос может висеть бесконечно"], ["speed", "Он ускоряет сервер"], ["auth", "Это пароль"], ["cache", "Он включает кэш"]], "hang",
        "По умолчанию таймаута нет."),
      single("hr-status", "Ошибка сервера", "Что значит код ответа 500?",
        [["server", "Ошибка на стороне сервера"], ["ok", "Успех"], ["notfound", "Страница не найдена"], ["auth", "Нужна авторизация"]], "server",
        "4xx — ошибка запроса, 5xx — сервера."),
      single("hr-json", "JSON", "Как получить разобранный JSON из ответа r?",
        [["json", "`r.json()`"], ["text", "`r.text()`"], ["load", "`json(r)`"], ["data", "`r.data`"]], "json",
        "r.text — сырой текст.")
    ]
  });

  L({
    slug: "automation", title: "Автоматизация", summary: "Скрипты для файлов: переименование, отчёты, аргументы командной строки argparse, запуск по расписанию.",
    skill: ["py-automation", "Автоматизация", "Писать скрипты, которые делают рутину за тебя."],
    now: "Умеем ходить в сеть и автоматизируем рутинные задачи.",
    body: [
      py("Переименование файлов", "pathlib в деле", "Скрипт проходит по папке и переименовывает файлы по шаблону.", "Сотни файлов за секунду вместо часа ручной работы.", "from pathlib import Path\n\nfor i, p in enumerate(sorted(Path(\"photos\").glob(\"*.jpg\")), start=1):\n    p.rename(p.with_name(f\"trip-{i:03}.jpg\"))"),
      py("argparse", "Аргументы командной строки", "`parser.add_argument(\"folder\")` и `args = parser.parse_args()` — скрипт принимает параметры и сам пишет --help.", "Один скрипт для разных папок и режимов.", "import argparse\n\nparser = argparse.ArgumentParser(description=\"Отчёт по оценкам\")\nparser.add_argument(\"csv\")\nparser.add_argument(\"--min\", type=int, default=60)\nargs = parser.parse_args()"),
      idea("Сначала пробный прогон", "--dry-run", "Скрипт, который меняет файлы, сначала печатает, что сделает, и только с флагом выполняет.", "Ошибка в шаблоне не испортит сотни файлов."),
      cmd("cron", "По расписанию", "Задача cron или Планировщик заданий Windows запускает скрипт каждый день.", "Ежедневный отчёт собирается сам."),
      tip("Скрипт, меняющий файлы, — сначала с --dry-run. Параметры — через argparse.")
    ],
    quizzes: [
      single("au-dry", "Пробный прогон", "Зачем скрипту переименования режим --dry-run?",
        [["preview", "Показать, что будет сделано, ничего не меняя"], ["fast", "Чтобы работал быстрее"], ["backup", "Чтобы сделать копию диска"], ["log", "Чтобы удалить журнал"]], "preview",
        "Проверка шаблона без риска."),
      single("au-argparse", "argparse", "Что даёт argparse?",
        [["args", "Разбор аргументов командной строки и справку --help"], ["parse", "Разбор HTML"], ["json", "Чтение JSON"], ["sched", "Запуск по расписанию"]], "args",
        "Справка пишется автоматически."),
      single("au-glob", "Найти файлы", "Как найти все .jpg в папке photos через pathlib?",
        [["glob", "`Path(\"photos\").glob(\"*.jpg\")`"], ["find", "`find(\"photos/*.jpg\")`"], ["ls", "`ls(\"photos\")`"], ["open", "`open(\"photos/*.jpg\")`"]], "glob",
        "glob ищет по шаблону.")
    ]
  });

  L({
    slug: "testing-project", title: "Тесты и структура проекта", summary: "pytest и assert, структура папок, pyproject.toml, ruff и что учить дальше.",
    skill: ["py-testing", "Тесты и проект", "Писать тесты pytest и оформлять проект."],
    now: "Автоматизируем рутину и оформляем код как настоящий проект.",
    body: [
      py("pytest", "Тест — функция с assert", "Файл test_*.py, функция test_*, внутри assert. Запуск — команда `pytest`.", "Изменил код — за секунду проверил, что ничего не сломал.", "# test_prices.py\nfrom prices import total_price\n\ndef test_total_price():\n    assert total_price(990, 3) == 2970\n\ndef test_zero_count():\n    assert total_price(990, 0) == 0"),
      idea("Структура проекта", "Порядок в папках", "Код — в пакете (папка с модулями), тесты — в tests/, зависимости и настройки — в pyproject.toml, окружение — в .venv (не в git).", "Любой разработчик сразу понимает, где что."),
      cmd("ruff", "Линтер и форматтер", "`ruff check .` находит ошибки и плохой стиль, `ruff format .` приводит код к единому виду.", "Стиль проверяет машина, люди обсуждают логику."),
      idea("Что дальше", "Куда расти", "Веб — FastAPI или Django, данные — pandas и Jupyter, автоматизация — ещё больше скриптов. Главное — свои маленькие проекты.", "Язык закрепляется только практикой."),
      tip("Каждая функция с логикой — с тестом. Проект: пакет, tests/, pyproject.toml, ruff.")
    ],
    quizzes: [
      single("tp-name", "Имена", "Как pytest находит тесты?",
        [["prefix", "По файлам test_*.py и функциям test_*"], ["folder", "Только в папке pytest"], ["decorator", "Только по декоратору @test"], ["manual", "Их нужно перечислить вручную"]], "prefix",
        "Соглашение об именах."),
      single("tp-venv", "В git", "Нужно ли класть .venv в git?",
        [["no", "Нет, окружение пересоздают по списку зависимостей"], ["yes", "Да, всегда"], ["zip", "Только в архиве"], ["half", "Только папку bin"]], "no",
        ".venv добавляют в .gitignore."),
      multi("tp-tools", "Инструменты", "Что помогает поддерживать качество Python-проекта?",
        [["pytest", "pytest"], ["ruff", "ruff"], ["mypy", "mypy"], ["paint", "Paint"]], ["pytest", "ruff", "mypy"],
        "Тесты, линтер и проверка типов.")
    ]
  });
}
