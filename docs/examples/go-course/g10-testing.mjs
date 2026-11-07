// Chapter 10: tests and tools — testing package, table tests, benchmarks, profiling and linting.
import { go, sh, idea, tip, makeLesson } from "./gokit.mjs";

export default function testing(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "unit-tests", title: "Тесты", summary: "Файлы _test.go, func TestX(t *testing.T), t.Errorf и t.Fatal, go test ./..., покрытие.",
    skill: ["go-tests", "Тесты", "Писать и запускать тесты встроенным пакетом testing."],
    now: "Управляем горутинами и защищаем код тестами.",
    body: [
      go("_test.go", "Тест рядом с кодом", "Файл price_test.go, функция TestTotal(t *testing.T). Никаких внешних библиотек не нужно.", "Тесты встроены в язык и инструменты.", "func TestTotal(t *testing.T) {\n    got := Total(990, 3)\n    if got != 2970 {\n        t.Errorf(\"Total(990, 3) = %d, ожидали 2970\", got)\n    }\n}"),
      sh("go test", "Запуск", "`go test ./...` — все тесты проекта, `-run TestTotal` — один, `-v` — подробно, `-cover` — покрытие.", "Одна команда для всего проекта.", "$ go test ./...\nok   example.com/academy/internal/course  0.012s\nok   example.com/academy/internal/store   0.034s"),
      idea("Errorf и Fatal", "Продолжить или остановиться", "t.Errorf отмечает провал и продолжает тест, t.Fatal — останавливает его сразу.", "Fatal — когда дальше проверять бессмысленно."),
      idea("Пакет и черный ящик", "package x_test", "Тест в пакете x_test видит только экспортированное — как настоящий пользователь пакета.", "Тесты не завязаны на внутренности."),
      tip("Тест — функция TestX в _test.go. Запуск — go test ./... с -race в CI.")
    ],
    quizzes: [
      single("ut-file", "Файл", "Как должен называться файл с тестами для price.go?",
        [["test", "price_test.go"], ["spec", "price.spec.go"], ["tests", "tests/price.go"], ["any", "Как угодно"]], "test",
        "Суффикс _test.go."),
      single("ut-fatal", "Fatal", "Чем t.Fatal отличается от t.Errorf?",
        [["stop", "Fatal сразу останавливает тест, Errorf — продолжает"], ["same", "Ничем"], ["panic", "Fatal роняет всю программу"], ["log", "Fatal только пишет в лог"]], "stop",
        "Оба отмечают провал."),
      single("ut-all", "Все тесты", "Как запустить все тесты проекта?",
        [["all", "`go test ./...`"], ["test", "`go run tests`"], ["npm", "`npm test`"], ["make", "`make all`"]], "all",
        "Три точки — все пакеты.")
    ]
  });

  L({
    slug: "table-tests", title: "Табличные тесты", summary: "Срез случаев, t.Run для подтестов, моки через интерфейсы, httptest для обработчиков.",
    skill: ["go-tabletests", "Табличные тесты", "Писать табличные тесты и тестировать через интерфейсы."],
    now: "Пишем первые тесты и покрываем много случаев компактно.",
    body: [
      go("Таблица случаев", "Срез структур", "Входы и ожидания — в срезе, проверка — в одном цикле с t.Run для каждого случая.", "Новый случай — одна строка, а не новый тест.", "tests := []struct {\n    name string\n    in   string\n    want int\n}{\n    {\"число\", \"42\", 42},\n    {\"пробелы\", \" 7 \", 7},\n}\nfor _, tt := range tests {\n    t.Run(tt.name, func(t *testing.T) {\n        if got := Parse(tt.in); got != tt.want {\n            t.Errorf(\"got %d, want %d\", got, tt.want)\n        }\n    })\n}"),
      idea("Подставные типы", "Через интерфейсы", "Функция принимает интерфейс Store — в тесте передают простую реализацию в памяти.", "Тесты быстрые и не требуют базы."),
      go("httptest", "Тест обработчика", "httptest.NewRecorder и NewRequest вызывают HTTP-обработчик без сети.", "Проверка статуса и тела ответа за миллисекунды.", "req := httptest.NewRequest(\"GET\", \"/health\", nil)\nrec := httptest.NewRecorder()\nhandler.ServeHTTP(rec, req)\nif rec.Code != 200 { t.Fatal(rec.Code) }"),
      tip("Много случаев — таблица и t.Run. Внешние зависимости — интерфейсы и подставные реализации.")
    ],
    quizzes: [
      single("tt-run", "Подтесты", "Зачем t.Run внутри табличного теста?",
        [["named", "У каждого случая своё имя и отдельный результат"], ["fast", "Ускоряет тест в 10 раз"], ["required", "Без него таблица не работает"], ["parallel", "Только для параллельности"]], "named",
        "Видно, какой случай упал."),
      single("tt-mock", "Без базы", "Как протестировать функцию, которая работает с базой, без базы?",
        [["iface", "Принимать интерфейс и подставить реализацию в памяти"], ["skip", "Пропустить тест"], ["prod", "Подключить боевую базу"], ["none", "Никак"]], "iface",
        "Поэтому принимают интерфейсы."),
      single("tt-http", "Обработчик", "Чем проверить HTTP-обработчик без запуска сервера?",
        [["httptest", "Пакетом httptest"], ["curl", "Только curl"], ["browser", "Браузером"], ["none", "Никак"]], "httptest",
        "NewRecorder и NewRequest.")
    ]
  });

  L({
    slug: "bench-profile", title: "Бенчмарки и профилирование", summary: "func BenchmarkX(b *testing.B), b.Loop, -benchmem, pprof, линтер golangci-lint.",
    skill: ["go-bench", "Бенчмарки и профилирование", "Измерять скорость кода и находить узкие места."],
    now: "Пишем табличные тесты и измеряем скорость кода.",
    body: [
      go("Бенчмарк", "Сколько стоит операция", "Функция BenchmarkX(b *testing.B) с циклом `for b.Loop()` измеряет время одной операции.", "Сравнить два решения цифрами, а не на глаз.", "func BenchmarkParse(b *testing.B) {\n    for b.Loop() {\n        Parse(\"42\")\n    }\n}"),
      sh("go test -bench", "Запуск", "`go test -bench=. -benchmem` — время и число выделений памяти на операцию.", "Выделения памяти часто важнее процессора.", "$ go test -bench=. -benchmem\nBenchmarkParse-8   52000000   22.4 ns/op   0 B/op   0 allocs/op"),
      idea("pprof", "Где тратится время", "Профиль процессора и памяти показывает, какие функции дороже всего. `go tool pprof` строит отчёт и граф.", "Оптимизируют то, что реально медленно."),
      sh("golangci-lint", "Набор линтеров", "Запускает десятки проверок сразу: ошибки без обработки, неиспользуемый код, стиль.", "Стандарт для CI проектов на Go."),
      tip("Сначала измерь (bench, pprof), потом оптимизируй. В CI — тесты с -race и golangci-lint.")
    ],
    quizzes: [
      single("bp-mem", "Память", "Какой флаг добавляет к бенчмарку статистику выделений памяти?",
        [["benchmem", "-benchmem"], ["mem", "-mem"], ["race", "-race"], ["cover", "-cover"]], "benchmem",
        "B/op и allocs/op."),
      single("bp-pprof", "pprof", "Что показывает pprof?",
        [["hot", "Какие функции тратят больше всего времени или памяти"], ["tests", "Какие тесты упали"], ["deps", "Список зависимостей"], ["style", "Ошибки стиля"]], "hot",
        "Оптимизируй найденное."),
      single("bp-first", "Порядок", "Что делать перед оптимизацией?",
        [["measure", "Измерить бенчмарком или профилем"], ["rewrite", "Переписать всё на ассемблере"], ["guess", "Угадать медленное место"], ["nothing", "Ничего"]], "measure",
        "Без измерений — гадание.")
    ]
  });
}
