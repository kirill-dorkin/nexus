// Chapter 9: concurrency — goroutines, channels, select, sync and context.
import { go, idea, tip, makeLesson } from "./gokit.mjs";

export default function concurrency(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "goroutines", title: "Горутины", summary: "Слово go, лёгкие потоки, sync.WaitGroup, гонки данных и флаг -race, Mutex.",
    skill: ["go-goroutines", "Горутины", "Запускать горутины и синхронизировать их."],
    now: "Организовали проект и учимся делать много дел одновременно.",
    body: [
      go("go", "Запустить параллельно", "`go fetch(url)` запускает функцию в горутине — лёгком потоке. Их могут быть тысячи.", "Десять запросов к API идут одновременно, а не по очереди.", "var wg sync.WaitGroup\nfor _, url := range urls {\n    wg.Go(func() {\n        fetch(url)\n    })\n}\nwg.Wait()"),
      idea("WaitGroup", "Дождаться всех", "main не ждёт горутины: программа завершится раньше. WaitGroup ждёт, пока все закончат (wg.Go или Add/Done).", "Без ожидания результаты потеряются."),
      idea("Гонка данных", "Два писателя", "Две горутины пишут одну переменную без синхронизации — результат непредсказуем.", "`go test -race` и `go run -race` находят гонки."),
      go("sync.Mutex", "Замок", "`mu.Lock()` и `defer mu.Unlock()` защищают общие данные.", "Счётчик посещений не теряет значения.", "type Counter struct {\n    mu sync.Mutex\n    n  int\n}\n\nfunc (c *Counter) Inc() {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    c.n++\n}"),
      tip("go — запустить, WaitGroup — дождаться, Mutex — защитить общее, -race — проверить.")
    ],
    quizzes: [
      single("gr-wait", "Ожидание", "Почему программа может завершиться, не дождавшись горутин?",
        [["main", "main не ждёт их — нужен WaitGroup или канал"], ["bug", "Это ошибка Go"], ["os", "Так решает ОС"], ["never", "Такого не бывает"]], "main",
        "Конец main — конец программы."),
      single("gr-race", "Гонка", "Как найти гонки данных?",
        [["race", "Запустить с флагом -race"], ["vet", "Только go fmt"], ["print", "Расставить Println"], ["none", "Никак"]], "race",
        "Детектор гонок встроен."),
      single("gr-mutex", "Защита", "Что защищает общую переменную от одновременной записи?",
        [["mutex", "sync.Mutex"], ["defer", "defer"], ["const", "const"], ["iota", "iota"]], "mutex",
        "Или передача данных через канал.")
    ]
  });

  L({
    slug: "channels", title: "Каналы", summary: "chan, отправка и приём, буфер, close и range, select, тайм-ауты.",
    skill: ["go-channels", "Каналы", "Передавать данные между горутинами каналами."],
    now: "Запускаем горутины и учим их обмениваться данными.",
    body: [
      go("chan", "Труба между горутинами", "`ch := make(chan int)`; `ch <- 5` — отправить, `v := <-ch` — получить. Небуферизованный канал ждёт обе стороны.", "Данные передаются, а не делятся — меньше гонок.", "results := make(chan string)\ngo func() {\n    results <- fetch(url)\n}()\nfmt.Println(<-results)"),
      idea("Буфер", "make(chan T, n)", "Буферизованный канал принимает n значений без ожидания получателя.", "Сглаживает разницу в скорости производителя и потребителя."),
      go("close и range", "Конец данных", "Отправитель закрывает канал, получатель читает `for v := range ch` до закрытия.", "Чёткий сигнал «больше ничего не будет».", "for line := range lines {\n    fmt.Println(line)\n}"),
      go("select", "Ждать несколько каналов", "select ждёт первый готовый канал. С time.After — тайм-аут.", "Запрос не висит вечно.", "select {\ncase r := <-results:\n    fmt.Println(r)\ncase <-time.After(2 * time.Second):\n    fmt.Println(\"тайм-аут\")\n}"),
      tip("Не делись памятью — передавай данные каналами. Закрывает отправитель.")
    ],
    quizzes: [
      single("ch-block", "Ожидание", "Что происходит при отправке в небуферизованный канал, пока никто не читает?",
        [["block", "Отправитель ждёт получателя"], ["drop", "Значение теряется"], ["panic", "Паника"], ["buffer", "Значение копится"]], "block",
        "Обе стороны встречаются."),
      single("ch-close", "Кто закрывает", "Кто должен закрывать канал?",
        [["sender", "Отправитель"], ["receiver", "Получатель"], ["both", "Оба"], ["gc", "Сборщик мусора"]], "sender",
        "Отправка в закрытый канал — паника."),
      single("ch-select", "Тайм-аут", "Как ограничить ожидание результата двумя секундами?",
        [["select", "select с case <-time.After(2 * time.Second)"], ["sleep", "time.Sleep и надеяться"], ["for", "Бесконечный for"], ["none", "Нельзя"]], "select",
        "Первый готовый case побеждает.")
    ]
  });

  L({
    slug: "context", title: "Контекст", summary: "context.Context для отмены и тайм-аутов, WithTimeout, передача первым аргументом, ctx.Done().",
    skill: ["go-context", "Контекст", "Отменять операции и задавать тайм-ауты через context."],
    now: "Передаём данные каналами и учимся вовремя останавливать работу.",
    body: [
      idea("Зачем context", "Отмена по цепочке", "Пользователь закрыл страницу — запрос к базе и к API должен остановиться. Context несёт сигнал отмены и срок.", "Сервер не тратит ресурсы на никому не нужную работу."),
      go("WithTimeout", "Срок операции", "`ctx, cancel := context.WithTimeout(ctx, 3*time.Second)` и `defer cancel()`.", "Медленный внешний сервис не повесит обработчик.", "ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)\ndefer cancel()\n\nrows, err := db.QueryContext(ctx, \"SELECT title FROM courses\")"),
      idea("Первый аргумент", "ctx context.Context", "Функции, которые ходят в сеть или базу, принимают ctx первым параметром.", "Отмена доходит до самого низа."),
      go("ctx.Done()", "Слушать отмену", "В долгом цикле проверяют `select { case <-ctx.Done(): return ctx.Err() default: }`.", "Своя долгая работа тоже останавливается."),
      tip("Сеть и база — с ctx первым аргументом. Тайм-аут — WithTimeout и defer cancel().")
    ],
    quizzes: [
      single("cx-why", "Зачем", "Для чего context.Context?",
        [["cancel", "Передавать отмену и сроки по цепочке вызовов"], ["global", "Хранить глобальные переменные"], ["log", "Писать логи"], ["db", "Подключаться к базе"]], "cancel",
        "И немного данных запроса."),
      single("cx-cancel", "cancel", "Зачем вызывать defer cancel() после WithTimeout?",
        [["free", "Освободить ресурсы контекста, когда работа закончена"], ["start", "Запустить таймер"], ["nothing", "Не нужно"], ["panic", "Чтобы вызвать панику"]], "free",
        "Иначе утечка таймера."),
      single("cx-arg", "Позиция", "Каким параметром принято передавать context?",
        [["first", "Первым"], ["last", "Последним"], ["field", "Полем структуры"], ["global", "Глобальной переменной"]], "first",
        "func Do(ctx context.Context, ...).")
    ]
  });
}
