// Chapter 8: Docker Compose — compose.yaml, services, volumes and networks, the dev workflow.
import { idea, sh, yml, tip, makeLesson } from "./dkit.mjs";

export default function compose(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "compose-basics", title: "Первый compose-файл", summary: "compose.yaml, services, image и build, ports, docker compose up и down.",
    skill: ["dk-compose", "Docker Compose", "Описывать многоконтейнерное приложение в compose-файле."],
    now: "Знаем сети и тома и описываем весь проект одним файлом.",
    body: [
      yml("compose.yaml", "Проект в одном файле", "Все сервисы, тома, сети и настройки описаны в YAML. Вместо пяти длинных docker run — одна команда.", "Любой разработчик поднимает весь проект за минуту.", "services:\n  api:\n    build: .\n    ports:\n      - \"8000:8000\"\n    environment:\n      DATABASE_URL: postgres://app:devpass@db:5432/app\n    depends_on:\n      - db\n  db:\n    image: postgres:17\n    environment:\n      POSTGRES_USER: app\n      POSTGRES_PASSWORD: devpass\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n\nvolumes:\n  pgdata:"),
      sh("docker compose up", "Поднять всё", "`docker compose up -d` собирает, создаёт сеть и тома и запускает сервисы в фоне. `--build` — пересобрать образы.", "Одна команда на весь проект.", "$ docker compose up -d\n[+] Running 3/3\n ✔ Network shop_default  Created\n ✔ Container shop-db-1   Started\n ✔ Container shop-api-1  Started"),
      sh("docker compose down", "Остановить и убрать", "Удаляет контейнеры и сеть. Тома остаются; `down -v` удалит и их.", "-v стирает данные базы — осторожно."),
      idea("Сеть проекта", "Создаётся сама", "Compose создаёт отдельную сеть, и сервисы находят друг друга по именам из файла: api ходит в db.", "Не нужно создавать сети вручную."),
      tip("compose up -d — поднять, down — убрать, down -v — убрать с данными.")
    ],
    quizzes: [
      single("cb-up", "Поднять", "Какая команда поднимает все сервисы проекта в фоне?",
        [["up", "`docker compose up -d`"], ["run", "`docker run compose`"], ["start", "`docker start all`"], ["build", "`docker compose build`"]], "up",
        "build только собирает."),
      single("cb-down", "Тома", "Удалит ли docker compose down данные в именованных томах?",
        [["no", "Нет, только с флагом -v"], ["yes", "Да, всегда"], ["half", "Удалит половину"], ["images", "Удалит только образы"]], "no",
        "down -v стирает тома."),
      single("cb-dns", "Имя сервиса", "Как сервис api обращается к сервису db из того же compose-файла?",
        [["name", "По имени db"], ["ip", "По IP хоста"], ["localhost", "Через localhost"], ["link", "Только через links"]], "name",
        "Compose создаёт общую сеть.")
    ]
  });

  L({
    slug: "compose-services", title: "Сервисы, зависимости и масштаб", summary: "depends_on с условием, healthcheck, restart, profiles, несколько файлов и override.",
    skill: ["dk-services", "Сервисы Compose", "Настраивать порядок запуска, перезапуск и профили сервисов."],
    now: "Пишем compose-файлы и настраиваем порядок запуска сервисов.",
    body: [
      yml("depends_on", "Порядок запуска", "depends_on только задаёт порядок старта. Чтобы ждать готовности базы, нужен healthcheck и `condition: service_healthy`.", "Иначе API стартует раньше, чем база начала принимать подключения.", "services:\n  api:\n    depends_on:\n      db:\n        condition: service_healthy\n  db:\n    image: postgres:17\n    healthcheck:\n      test: [\"CMD\", \"pg_isready\", \"-U\", \"app\"]\n      interval: 5s\n      retries: 10"),
      yml("restart", "Перезапуск", "`restart: unless-stopped` — то же, что флаг --restart.", "Сервисы поднимаются после сбоя сами."),
      yml("profiles", "Необязательные сервисы", "Сервис с `profiles: [tools]` запускается только с `docker compose --profile tools up`.", "Админка базы или почтовый перехватчик не мешают в обычной работе."),
      sh("Несколько файлов", "override", "compose.override.yaml подхватывается автоматически и дополняет основной файл. Для сервера — `-f compose.yaml -f compose.prod.yaml`.", "Общая часть одна, различия — в отдельных файлах."),
      tip("Ждать готовности — healthcheck + service_healthy. Различия окружений — в override-файлах.")
    ],
    quizzes: [
      single("cs-ready", "Готовность", "Что гарантирует простой depends_on: [db]?",
        [["order", "Только порядок запуска, не готовность базы"], ["ready", "Что база готова принимать подключения"], ["data", "Что в базе есть данные"], ["nothing", "Ничего"]], "order",
        "Для готовности — service_healthy."),
      single("cs-profile", "Профиль", "Как запустить сервисы из профиля tools?",
        [["profile", "`docker compose --profile tools up`"], ["tools", "`docker compose tools`"], ["f", "`docker compose -f tools up`"], ["env", "`TOOLS=1 docker up`"]], "profile",
        "Без флага такие сервисы не стартуют."),
      single("cs-override", "override", "Что делает файл compose.override.yaml?",
        [["merge", "Автоматически дополняет основной compose-файл"], ["replace", "Полностью заменяет его"], ["backup", "Хранит резервную копию"], ["nothing", "Игнорируется"]], "merge",
        "Удобно для локальных настроек.")
    ]
  });

  L({
    slug: "compose-dev", title: "Разработка с Compose", summary: "Код через bind mount, горячая перезагрузка, compose watch, logs, exec и run для одноразовых задач.",
    skill: ["dk-composedev", "Разработка с Compose", "Вести повседневную разработку через Compose."],
    now: "Настраиваем сервисы и работаем с Compose каждый день.",
    body: [
      yml("Код в контейнере", "Живые правки", "volumes с папкой проекта и команда сервера разработки с перезагрузкой.", "Редактор на хосте, окружение в контейнере.", "services:\n  web:\n    build: .\n    command: npm run dev\n    volumes:\n      - .:/app\n      - /app/node_modules\n    ports:\n      - \"3000:3000\""),
      idea("Анонимный том для зависимостей", "/app/node_modules", "Вторая строка volumes оставляет node_modules из образа, иначе папка проекта с хоста её перекроет.", "Зависимости, собранные под Linux, не смешиваются с хостовыми."),
      sh("compose watch", "Синхронизация", "`docker compose watch` синхронизирует файлы или пересобирает сервис по правилам из раздела develop.", "Быстрее bind mount на macOS и не трогает node_modules."),
      sh("logs, exec, run", "Повседневные команды", "`docker compose logs -f api`, `docker compose exec db psql -U app`, `docker compose run --rm api npm test` — одноразовая задача в новом контейнере.", "Миграции, тесты и консоль — без установки на хост.", "$ docker compose run --rm api python manage.py migrate\nApplying migrations... OK"),
      tip("Длинные процессы — up, одноразовые задачи — run --rm, консоль сервиса — exec.")
    ],
    quizzes: [
      single("cd-run", "Одноразовая задача", "Как запустить тесты в новом временном контейнере сервиса api?",
        [["run", "`docker compose run --rm api npm test`"], ["exec", "`docker compose exec api`"], ["up", "`docker compose up test`"], ["start", "`docker compose start npm`"]], "run",
        "exec — в уже работающем."),
      single("cd-nm", "node_modules", "Зачем в volumes строка /app/node_modules?",
        [["keep", "Чтобы папка хоста не перекрыла зависимости из образа"], ["speed", "Чтобы ускорить сеть"], ["delete", "Чтобы удалить зависимости"], ["backup", "Для резервной копии"]], "keep",
        "Анонимный том поверх bind mount."),
      single("cd-logs", "Логи сервиса", "Как следить за логами только сервиса api?",
        [["logs", "`docker compose logs -f api`"], ["all", "`docker logs compose`"], ["tail", "`tail -f api`"], ["ps", "`docker compose ps api`"]], "logs",
        "Без имени — логи всех сервисов.")
    ]
  });
}
