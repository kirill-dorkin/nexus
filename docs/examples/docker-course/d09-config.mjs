// Chapter 9: configuration and health — env files and variables, secrets, healthchecks, resource limits.
import { idea, sh, yml, df, tip, makeLesson } from "./dkit.mjs";

export default function config(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "env-config", title: "Настройки через окружение", summary: "Двенадцатифакторный подход, .env в Compose, подстановка ${VAR}, ARG и ENV.",
    skill: ["dk-env", "Настройки окружения", "Настраивать приложения в контейнерах через переменные окружения."],
    now: "Работаем с Compose каждый день и выносим настройки из кода.",
    body: [
      idea("Настройки снаружи", "Один образ на все среды", "Адреса, ключи и режимы работы приходят из переменных окружения, а не зашиты в образ. Образ один — для теста и для сервера.", "Протестировали образ — на сервер уходит именно он, а не пересобранный."),
      yml("Подстановка", "${VAR}", "Compose подставляет переменные из файла .env рядом с compose.yaml: `image: myapp:${TAG:-latest}`. `env_file:` передаёт файл целиком в контейнер.", "Версия и настройки меняются без правки compose-файла.", "services:\n  api:\n    image: registry.example.com/shop/api:${TAG:-dev}\n    env_file: .env.api"),
      df("ARG и ENV", "При сборке и при запуске", "ARG доступна только во время сборки, ENV остаётся в образе и видна при запуске.", "Версию для сборки — через ARG, значение по умолчанию для приложения — через ENV.", "ARG NODE_VERSION=22\nFROM node:${NODE_VERSION}-slim\nENV NODE_ENV=production"),
      idea("Не в ENV", "Секреты", "Пароли через ENV в Dockerfile попадают в образ и видны в docker inspect.", "Секреты передают при запуске, а лучше — через secrets."),
      tip("Образ один, настройки — снаружи. ARG — сборка, ENV — запуск. Секреты не в Dockerfile.")
    ],
    quizzes: [
      single("ec-arg", "ARG", "Когда доступна переменная из ARG?",
        [["build", "Только во время сборки образа"], ["run", "Только при запуске"], ["both", "Всегда"], ["never", "Никогда"]], "build",
        "ENV остаётся в образе."),
      single("ec-default", "Значение по умолчанию", "Что значит ${TAG:-dev} в compose-файле?",
        [["default", "Значение TAG, а если не задано — dev"], ["minus", "TAG минус dev"], ["only", "Только dev"], ["error", "Ошибка, если нет TAG"]], "default",
        "Как в оболочке."),
      single("ec-one", "Один образ", "Почему хорошо иметь один образ для тестов и сервера?",
        [["same", "На сервер уходит ровно то, что проверили"], ["small", "Он меньше"], ["fast", "Быстрее сборка"], ["secret", "Он хранит пароли"]], "same",
        "Различия — только в настройках.")
    ]
  });

  L({
    slug: "secrets", title: "Секреты", summary: "Почему не ENV, secrets в Compose как файлы, секреты сборки --mount=type=secret.",
    skill: ["dk-secrets", "Секреты", "Передавать пароли и ключи в контейнеры безопасно."],
    now: "Вынесли настройки наружу и отдельно разбираемся с паролями и ключами.",
    body: [
      idea("Где утекают секреты", "Слои, inspect, логи", "Секрет в слое образа, в ENV (виден в docker inspect), в истории команд или в выводе логов.", "Утечка ключа к облаку стоит дороже любого сервера."),
      yml("secrets в Compose", "Секрет как файл", "Секрет монтируется в контейнер файлом /run/secrets/имя. Многие образы читают пароль из файла: POSTGRES_PASSWORD_FILE.", "Пароля нет ни в переменных, ни в образе.", "services:\n  db:\n    image: postgres:17\n    environment:\n      POSTGRES_PASSWORD_FILE: /run/secrets/db_password\n    secrets:\n      - db_password\n\nsecrets:\n  db_password:\n    file: ./secrets/db_password.txt"),
      df("Секрет при сборке", "--mount=type=secret", "Токен к закрытому реестру пакетов нужен только во время RUN и не должен остаться в слое.", "Сборка получает ключ, а образ — нет.", "RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci"),
      idea(".gitignore", "Не в репозиторий", "Файлы .env и папка secrets — в .gitignore. В репозитории — только пример .env.example без настоящих значений.", "Закоммиченный ключ считается утёкшим, даже если коммит удалили."),
      tip("Секреты — файлами из secrets, при сборке — через --mount=type=secret, в git — никогда.")
    ],
    quizzes: [
      single("se-where", "Где лежит", "Где сервис видит секрет из раздела secrets в Compose?",
        [["file", "Файлом в /run/secrets/"], ["env", "В переменной окружения"], ["image", "В образе"], ["logs", "В логах"]], "file",
        "Пароль читают из файла."),
      single("se-build", "При сборке", "Как передать токен в RUN, чтобы он не остался в слое?",
        [["mount", "`RUN --mount=type=secret,...`"], ["env", "Через ENV"], ["copy", "COPY и потом rm"], ["arg", "Через ARG"]], "mount",
        "ARG тоже виден в истории образа."),
      single("se-git", "Ключ в git", "Ключ случайно закоммитили и удалили следующим коммитом. Что делать?",
        [["rotate", "Считать ключ утёкшим и выпустить новый"], ["nothing", "Ничего, его уже нет"], ["rename", "Переименовать файл"], ["force", "Только сделать force push"]], "rotate",
        "История git хранит всё.")
    ]
  });

  L({
    slug: "health-limits", title: "Проверки здоровья и ресурсы", summary: "HEALTHCHECK, состояния healthy и unhealthy, лимиты памяти и процессора, OOM.",
    skill: ["dk-health", "Здоровье и ресурсы", "Настраивать проверки здоровья и лимиты ресурсов."],
    now: "Защитили секреты и следим, чтобы сервис был жив и не съел весь сервер.",
    body: [
      df("HEALTHCHECK", "Жив ли сервис", "Docker периодически выполняет команду проверки. Код 0 — healthy, иначе после нескольких попыток — unhealthy.", "Процесс работает, но завис — проверка это заметит.", "HEALTHCHECK --interval=10s --timeout=3s --retries=3 \\\n  CMD curl -fsS http://localhost:8000/health || exit 1"),
      idea("Эндпоинт /health", "Что проверять", "Лёгкий адрес, который отвечает 200, если приложение готово: подключение к базе есть, очередь доступна.", "Прокси и оркестраторы направляют запросы только на здоровые экземпляры."),
      sh("Лимиты", "--memory и --cpus", "`--memory 512m --cpus 1.5` — контейнер не съест больше. В Compose — `deploy.resources.limits`.", "Утечка памяти в одном сервисе не уронит весь сервер.", "$ docker run -d --memory 512m --cpus 1.5 myapi:1.0"),
      idea("OOM", "Нехватка памяти", "Превысил лимит памяти — ядро убивает процесс (код 137, OOMKilled: true в inspect).", "Видишь 137 — смотри лимиты и потребление памяти."),
      sh("docker stats", "Потребление вживую", "Показывает CPU, память, сеть и диск каждого контейнера в реальном времени.", "Подобрать лимиты по реальным цифрам.", "$ docker stats --no-stream\nNAME   CPU %   MEM USAGE / LIMIT\napi    2.31%   148MiB / 512MiB\ndb     0.45%   61MiB / 1GiB"),
      tip("У каждого сервиса — /health и HEALTHCHECK. У каждого — лимит памяти.")
    ],
    quizzes: [
      single("hl-unhealthy", "unhealthy", "Процесс работает, но проверка здоровья трижды упала. Какой статус?",
        [["unhealthy", "unhealthy"], ["healthy", "healthy"], ["exited", "exited"], ["paused", "paused"]], "unhealthy",
        "Docker видит, что сервис не отвечает."),
      single("hl-oom", "OOMKilled", "Что значит OOMKilled: true в docker inspect?",
        [["memory", "Процесс убит из-за превышения лимита памяти"], ["ok", "Всё в порядке"], ["net", "Сеть отключена"], ["disk", "Кончился диск"]], "memory",
        "Код выхода 137."),
      single("hl-stats", "Потребление", "Какая команда покажет память и CPU контейнеров вживую?",
        [["stats", "`docker stats`"], ["top", "`docker images`"], ["ps", "`docker ps -a`"], ["logs", "`docker logs`"]], "stats",
        "--no-stream — один снимок.")
    ]
  });
}
