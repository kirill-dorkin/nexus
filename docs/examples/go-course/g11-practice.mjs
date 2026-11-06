// Chapter 11: Go in practice — an HTTP server, JSON APIs and databases, CLIs and shipping.
import { go, sh, idea, tip, makeLesson } from "./gokit.mjs";

export default function practice(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi, short } = c;

  L({
    slug: "http-server", title: "HTTP-сервер", summary: "net/http, маршруты с методами и параметрами в ServeMux, обработчики, тайм-ауты сервера, slog.",
    skill: ["go-http", "HTTP-сервер", "Писать HTTP-сервер на стандартной библиотеке."],
    now: "Измеряем скорость и пишем настоящий веб-сервер.",
    body: [
      go("ServeMux", "Маршруты", "Стандартный маршрутизатор понимает метод и параметры: `\"GET /courses/{slug}\"`, значение — r.PathValue(\"slug\").", "Для большинства API фреймворк не нужен.", "mux := http.NewServeMux()\nmux.HandleFunc(\"GET /courses/{slug}\", func(w http.ResponseWriter, r *http.Request) {\n    slug := r.PathValue(\"slug\")\n    fmt.Fprintf(w, \"курс %s\", slug)\n})\nlog.Fatal(http.ListenAndServe(\":8080\", mux))"),
      idea("Каждый запрос — горутина", "Конкурентность даром", "Сервер обрабатывает каждый запрос в своей горутине. Общие данные защищают Mutex.", "Тысячи одновременных запросов без настройки."),
      go("Тайм-ауты", "http.Server", "Сервер без тайм-аутов можно повесить медленными клиентами. Задают ReadTimeout, WriteTimeout, IdleTimeout.", "Защита от зависших соединений.", "srv := &http.Server{\n    Addr:         \":8080\",\n    Handler:      mux,\n    ReadTimeout:  5 * time.Second,\n    WriteTimeout: 10 * time.Second,\n}"),
      go("slog", "Структурные логи", "log/slog пишет логи с полями в JSON: `slog.Info(\"запрос\", \"path\", r.URL.Path)`.", "Логи удобно искать и фильтровать."),
      tip("Маршруты — ServeMux с методами и {параметрами}. У сервера — тайм-ауты, логи — slog.")
    ],
    quizzes: [
      single("hs-param", "Параметр", "Как получить {slug} из маршрута \"GET /courses/{slug}\"?",
        [["pathvalue", "`r.PathValue(\"slug\")`"], ["query", "`r.URL.Query().Get(\"slug\")`"], ["params", "`r.Params[\"slug\"]`"], ["form", "`r.FormValue(\"slug\")` всегда"]], "pathvalue",
        "Появилось в Go 1.22."),
      single("hs-timeout", "Тайм-ауты", "Почему важно задать тайм-ауты http.Server?",
        [["hang", "Медленные клиенты иначе держат соединения бесконечно"], ["speed", "Чтобы ускорить ответы"], ["tls", "Без них нет HTTPS"], ["none", "Не важно"]], "hang",
        "ListenAndServe без настроек — без тайм-аутов."),
      single("hs-goroutine", "Запросы", "Как сервер net/http обрабатывает одновременные запросы?",
        [["goroutine", "Каждый в своей горутине"], ["queue", "По одному в очереди"], ["process", "В отдельном процессе"], ["thread", "В одном потоке по очереди"]], "goroutine",
        "Поэтому общие данные защищают.")
    ]
  });

  L({
    slug: "json-db", title: "JSON API и база данных", summary: "Чтение и запись JSON в обработчике, database/sql и pgx, запросы с параметрами, транзакции.",
    skill: ["go-api", "JSON и база", "Писать JSON API с базой данных."],
    now: "Пишем сервер и подключаем к нему JSON и базу данных.",
    body: [
      go("JSON в обработчике", "Decoder и Encoder", "`json.NewDecoder(r.Body).Decode(&in)` — прочитать тело, `json.NewEncoder(w).Encode(out)` — ответить.", "API без лишних библиотек.", "var in struct{ Title string `json:\"title\"` }\nif err := json.NewDecoder(r.Body).Decode(&in); err != nil {\n    http.Error(w, \"неверный JSON\", http.StatusBadRequest)\n    return\n}\nw.Header().Set(\"Content-Type\", \"application/json\")\njson.NewEncoder(w).Encode(map[string]string{\"status\": \"ok\"})"),
      go("database/sql и pgx", "Запросы к Postgres", "Пул подключений открывают один раз, запросы — с контекстом и параметрами $1, $2.", "Параметры защищают от SQL-инъекций.", "row := db.QueryRowContext(ctx, \"SELECT title FROM courses WHERE slug = $1\", slug)\nvar title string\nif err := row.Scan(&title); err != nil {\n    return err\n}"),
      idea("Транзакции", "Всё или ничего", "BeginTx, несколько запросов, Commit; при ошибке — Rollback (через defer).", "Деньги не спишутся без создания заказа."),
      idea("Без конкатенации", "Только параметры", "Никогда не вставляй ввод пользователя в SQL через fmt.Sprintf.", "Классическая уязвимость SQL-инъекции."),
      tip("JSON — Decoder и Encoder. SQL — только с параметрами и контекстом. Связанные изменения — в транзакции.")
    ],
    quizzes: [
      single("jd-param", "Параметры", "Как безопасно передать slug в SQL-запрос?",
        [["param", "Параметром $1 в QueryRowContext"], ["sprintf", "Через fmt.Sprintf"], ["concat", "Склейкой строк"], ["escape", "Заменой кавычек вручную"]], "param",
        "Защита от инъекций."),
      single("jd-decode", "Тело запроса", "Как прочитать JSON из тела запроса?",
        [["decoder", "`json.NewDecoder(r.Body).Decode(&in)`"], ["read", "`r.JSON()`"], ["parse", "`JSON.parse(r.Body)`"], ["form", "`r.FormValue(\"json\")`"]], "decoder",
        "Ошибку декодирования проверяют."),
      single("jd-tx", "Транзакция", "Зачем транзакция при создании заказа и списании оплаты?",
        [["atomic", "Чтобы оба изменения прошли вместе или не прошли вовсе"], ["speed", "Для скорости"], ["log", "Для логов"], ["none", "Не нужна"]], "atomic",
        "Rollback при ошибке.")
    ]
  });

  L({
    slug: "cli-ship", title: "Утилиты и выпуск", summary: "Утилита командной строки с flag, сборка под разные ОС, маленький Docker-образ, что учить дальше.",
    skill: ["go-ship", "Утилиты и выпуск", "Писать утилиты и выпускать программы на Go."],
    now: "Пишем API с базой и выпускаем программы на Go.",
    body: [
      go("flag", "Аргументы командной строки", "Пакет flag разбирает флаги и сам пишет --help.", "Удобная утилита за пару строк.", "dir := flag.String(\"dir\", \".\", \"папка для отчёта\")\nverbose := flag.Bool(\"v\", false, \"подробный вывод\")\nflag.Parse()"),
      sh("Сборка под все системы", "GOOS и GOARCH", "Одной машиной собирают версии для Linux, macOS и Windows.", "Раздать утилиту всем коллегам.", "$ GOOS=linux GOARCH=amd64 go build -o dist/report-linux ./cmd/report\n$ GOOS=windows GOARCH=amd64 go build -o dist/report.exe ./cmd/report"),
      idea("Крошечный образ", "distroless", "Статический бинарник кладут в образ distroless или scratch — образ весит единицы мегабайт.", "Быстрая доставка и минимум уязвимостей."),
      idea("Что дальше", "Куда расти", "Глубже в конкурентность и профилирование, gRPC, очереди сообщений, Kubernetes-операторы. Главное — свой сервис до реальной нагрузки.", "Язык закрепляется на настоящих задачах."),
      tip("Утилита — flag и один бинарник. Сервер — статический бинарник в маленьком образе.")
    ],
    quizzes: [
      single("cs-flag", "Флаги", "Какой пакет стандартной библиотеки разбирает аргументы командной строки?",
        [["flag", "flag"], ["args", "args"], ["cli", "cli"], ["os", "Только os.Args вручную"]], "flag",
        "И пишет --help."),
      single("cs-cross", "Под Windows", "Как на Mac собрать программу для Windows?",
        [["env", "`GOOS=windows GOARCH=amd64 go build`"], ["vm", "Только в виртуальной машине Windows"], ["wine", "Через Wine"], ["no", "Нельзя"]], "env",
        "Кросс-компиляция встроена."),
      single("cs-image", "Образ", "Почему сервис на Go легко упаковать в крошечный образ?",
        [["static", "Это один статический бинарник без зависимостей"], ["interp", "Go не нужен интерпретатор только в Docker"], ["small", "Код на Go короче"], ["none", "Нельзя"]], "static",
        "distroless или scratch.")
    ]
  });
}
