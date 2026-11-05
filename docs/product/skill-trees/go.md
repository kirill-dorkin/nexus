# Go — Бегун

- **Источник полноты:**
  - The Go Programming Language Specification (вся спецификация);
  - Effective Go, Go Memory Model;
  - документация стандартной библиотеки: `fmt`, `strings`, `strconv`, `errors`, `io`, `bufio`, `os`, `path/filepath`, `time`, `context`, `sync`, `sync/atomic`, `net/http`, `encoding/json`, `database/sql`, `testing`, `log/slog`, `slices`, `maps`, `iter`, `sort`, `regexp`, `flag`, `embed`;
  - команда `go` (modules, build, test, vet, generate, work).
- **Стоит на:** Терминал, ПК.
- **Союзники:** Docker, Kubernetes (их экосистема на Go). Доверенный раннер грейдера Nexus написан на Go.
- **Способности:**
  - Синтаксис;
  - Типы;
  - Интерфейсы;
  - Ошибки;
  - Горутины;
  - HTTP;
  - Тесты;
  - Инструменты.
- **Объём:** 32 навыка.

## Ветки

### Старт (Основа)
- `go-what` — установка, `go run`, `go build`, пакет `main`, модули `go mod init`
- `go-basics` — переменные, `:=`, константы, `iota`, базовые типы, нулевые значения
- `go-control` — `if`, `for` (все формы), `switch`, `defer`
- `go-functions` — функции, несколько результатов, именованные результаты, вариадические, замыкания

### Составные типы (Основа)
- `go-arrays-slices` — массивы и срезы, `append`, ёмкость, пакет `slices`
- `go-maps` — `map`, пакет `maps`
- `go-strings-runes` — строки, байты, руны, UTF-8, `strings`, `strconv`
- `go-structs` — структуры, встраивание, теги

### Методы и интерфейсы (Практика)
- `go-methods` — методы, получатели-значения и указатели
- `go-pointers` — указатели
- `go-interfaces` — интерфейсы, неявная реализация, `any`, утверждения типа, type switch
- `go-generics` — обобщения: параметры типа, ограничения, `comparable`

### Ошибки (Практика)
- `go-errors` — `error`, `errors.New`, `fmt.Errorf` с `%w`, `errors.Is`/`As`/`Join`
- `go-panic-recover` — `panic` и `recover`: когда допустимо

### Конкурентность (Практика)
- `go-goroutines` — горутины
- `go-channels` — каналы, буферизация, `select`, закрытие
- `go-sync` — `sync.Mutex`, `RWMutex`, `WaitGroup`, `Once`, `sync/atomic`, `errgroup` (союзник)
- `go-context` — `context`: отмена, таймауты, значения
- `go-memory-model` — модель памяти, гонки, `-race`

### Стандартная библиотека (Практика)
- `go-io` — `io.Reader`/`Writer`, `bufio`, `os`, файлы
- `go-json` — `encoding/json`, теги, свои маршалеры
- `go-http` — `net/http`: сервер, `ServeMux` с шаблонами маршрутов, middleware, клиент, таймауты
- `go-database-sql` — `database/sql`, драйверы, пул, транзакции
- `go-time-slog` — `time`, `log/slog`
- `go-iterators` — итераторы `iter.Seq`, range-over-func

### Тестирование (Практика)
- `go-testing` — `testing`, табличные тесты, подтесты, `httptest`
- `go-bench-fuzz` — бенчмарки, фаззинг, покрытие

### Инструменты (Практика)
- `go-tooling` — `go vet`, `gofmt`, `go generate`, `go work`, кросс-компиляция, `embed`
- `go-modules-deps` — модули, версии, `go.sum`, прокси, vendoring

### Производительность (Продвинутое)
- `go-profiling` — pprof, трассировка, escape analysis, аллокации

### Справочник (Полное покрытие)
- `go-spec-full` — спецификация полностью: метки, `goto`, области видимости, константные выражения, преобразования, правила `init`
- `go-stdlib-other` — `regexp`, `flag`, `sort`, `os/exec`, `crypto/*` — по индексу

## Бои

| Ветка | Бой |
|---|---|
| Методы и интерфейсы | Хранилище с интерфейсом и двумя реализациями |
| Конкурентность | Параллельный обходчик ссылок с ограничением и отменой |
| Стандартная библиотека | HTTP-API с БД и тестами |
| Производительность | Ускорить функцию по профилю |

Проверка — грейдер.
