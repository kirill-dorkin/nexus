// Chapter 4: Dockerfile — instructions, build context and .dockerignore, CMD and ENTRYPOINT.
import { idea, sh, df, tip, makeLesson } from "./dkit.mjs";

export default function dockerfile(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi, short } = c;

  L({
    slug: "dockerfile-basics", title: "Первый Dockerfile", summary: "FROM, WORKDIR, COPY, RUN, EXPOSE, CMD и сборка docker build -t.",
    skill: ["dk-dockerfile", "Dockerfile", "Описывать образ приложения в Dockerfile."],
    now: "Запускаем чужие образы и собираем свой собственный.",
    body: [
      df("Dockerfile", "Рецепт образа", "Текстовый файл с инструкциями: от какого образа начать, что скопировать, что установить и что запускать.", "Сборка образа становится воспроизводимой — кто угодно соберёт тот же образ.", "FROM python:3.13-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD [\"python\", \"app.py\"]"),
      df("FROM и WORKDIR", "Основа и папка", "FROM задаёт базовый образ, WORKDIR — рабочую папку для следующих команд (создаётся сама).", "Не нужно писать cd в каждой команде."),
      df("COPY и RUN", "Файлы и команды", "COPY переносит файлы из контекста сборки в образ, RUN выполняет команду при сборке и сохраняет результат слоем.", "Установка зависимостей — RUN, код приложения — COPY."),
      sh("docker build", "Собрать образ", "`docker build -t myapp:1.0 .` — собрать образ из Dockerfile в текущей папке и дать ему имя с тегом.", "Точка в конце — контекст сборки, о нём в следующем уроке.", "$ docker build -t myapp:1.0 .\n[+] Building 12.4s (10/10) FINISHED\n => naming to docker.io/library/myapp:1.0"),
      df("EXPOSE", "Документация порта", "EXPOSE сообщает, какой порт слушает приложение, но сам порт не публикует — это делает -p.", "Подсказка тем, кто будет запускать образ."),
      tip("Порядок: FROM → WORKDIR → зависимости → код → CMD. Сборка — docker build -t имя:тег .")
    ],
    quizzes: [
      single("db-from", "Основа", "Какая инструкция задаёт базовый образ?",
        [["from", "FROM"], ["base", "BASE"], ["image", "IMAGE"], ["run", "RUN"]], "from",
        "Это первая инструкция Dockerfile."),
      single("db-run", "Когда выполняется", "Когда выполняется команда из инструкции RUN?",
        [["build", "При сборке образа"], ["start", "При каждом запуске контейнера"], ["stop", "При остановке"], ["pull", "При скачивании"]], "build",
        "При запуске — CMD."),
      single("db-expose", "EXPOSE", "Публикует ли EXPOSE 8000 порт на хосте?",
        [["no", "Нет, это документация; публикует -p"], ["yes", "Да, всегда"], ["random", "Публикует на случайный порт"], ["udp", "Только UDP"]], "no",
        "Порт публикуют при запуске.")
    ]
  });

  L({
    slug: "build-context", title: "Контекст сборки и .dockerignore", summary: "Что такое контекст, почему сборка медленная, .dockerignore и секреты, которые утекли в образ.",
    skill: ["dk-context", "Контекст сборки", "Управлять контекстом сборки через .dockerignore."],
    now: "Пишем Dockerfile и разбираемся, какие файлы попадают в сборку.",
    body: [
      idea("Контекст сборки", "Папка, которую видит сборка", "Точка в `docker build .` — контекст: вся папка отправляется сборщику. COPY может взять только то, что в контексте.", "Огромная папка node_modules или .git замедляет каждую сборку."),
      idea(".dockerignore", "Что не отправлять", "Файл с шаблонами, как .gitignore: node_modules, .git, .env, *.log. Эти файлы не попадут в контекст.", "Сборка быстрее, а секреты не утекают в образ.", "node_modules\n.git\n.env\n*.log\ndist"),
      idea("Секреты в образе", "Навсегда в слое", "Скопированный .env или ключ остаётся в слое образа, даже если позже удалить его командой RUN rm. Любой, кто скачал образ, его достанет.", "Секреты передают при запуске, а не при сборке."),
      sh("Ошибка COPY", "file not found", "«COPY failed: file not found in build context» — файл вне контекста или исключён .dockerignore.", "Проверь путь относительно контекста и .dockerignore."),
      tip("Всегда заводи .dockerignore. Секреты никогда не копируй в образ.")
    ],
    quizzes: [
      single("bc-dot", "Точка", "Что значит точка в `docker build -t app .`?",
        [["context", "Текущая папка — контекст сборки"], ["tag", "Тег по умолчанию"], ["root", "Корень диска"], ["nothing", "Ничего"]], "context",
        "Её содержимое уходит сборщику."),
      single("bc-secret", "Секрет", "Ключ скопировали в образ, а следующей командой RUN удалили. Он в безопасности?",
        [["no", "Нет, он остался в предыдущем слое"], ["yes", "Да, файл удалён"], ["half", "Только в alpine"], ["hidden", "Да, слои скрыты"]], "no",
        "Слои неизменяемы."),
      multi("bc-ignore", ".dockerignore", "Что обычно добавляют в .dockerignore?",
        [["nm", "node_modules"], ["git", ".git"], ["env", ".env"], ["src", "Исходный код приложения"]], ["nm", "git", "env"],
        "Код как раз нужен в образе.")
    ]
  });

  L({
    slug: "cmd-entrypoint", title: "CMD и ENTRYPOINT", summary: "Что запускается в контейнере, exec-форма и shell-форма, переопределение команды, PID 1 и сигналы.",
    skill: ["dk-cmd", "CMD и ENTRYPOINT", "Задавать команду запуска контейнера правильно."],
    now: "Управляем контекстом сборки и решаем, что запускается в контейнере.",
    body: [
      df("CMD", "Команда по умолчанию", "CMD задаёт команду запуска. Её можно заменить при запуске: `docker run myapp python manage.py migrate`.", "Один образ — разные задачи.", "CMD [\"python\", \"app.py\"]"),
      df("ENTRYPOINT", "Неизменная часть", "ENTRYPOINT задаёт программу, а CMD — её аргументы по умолчанию. Аргументы из docker run заменяют только CMD.", "Образ ведёт себя как программа: `docker run tool --help`.", "ENTRYPOINT [\"curl\"]\nCMD [\"--help\"]"),
      df("Exec-форма", "Массив, а не строка", "`CMD [\"node\", \"server.js\"]` запускает процесс напрямую. Строковая форма `CMD node server.js` запускает через sh, и приложение не получает сигналы остановки.", "С exec-формой docker stop завершает приложение мягко, а не через 10 секунд."),
      idea("PID 1", "Главный процесс", "Процесс из CMD получает номер 1 и должен корректно обрабатывать SIGTERM. Иначе остановка занимает 10 секунд и заканчивается SIGKILL.", "Мягкая остановка сохраняет незавершённые запросы и данные."),
      tip("Пиши CMD и ENTRYPOINT массивом. ENTRYPOINT — программа, CMD — аргументы по умолчанию.")
    ],
    quizzes: [
      single("ce-override", "Замена", "Что заменяют аргументы после имени образа в docker run?",
        [["cmd", "CMD"], ["entry", "ENTRYPOINT"], ["from", "FROM"], ["both", "Весь Dockerfile"]], "cmd",
        "ENTRYPOINT меняют флагом --entrypoint."),
      single("ce-exec", "Форма", "Почему лучше `CMD [\"node\", \"server.js\"]`, чем `CMD node server.js`?",
        [["signals", "Процесс получает сигналы остановки напрямую"], ["short", "Короче"], ["faster", "Быстрее собирается"], ["same", "Разницы нет"]], "signals",
        "Строковая форма запускает через sh."),
      single("ce-slow", "Долгая остановка", "docker stop всегда ждёт 10 секунд. Вероятная причина?",
        [["sigterm", "Приложение не обрабатывает SIGTERM"], ["disk", "Медленный диск"], ["net", "Медленная сеть"], ["tag", "Старый тег"]], "sigterm",
        "Через 10 секунд приходит SIGKILL.")
    ]
  });
}
