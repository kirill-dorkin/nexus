// Chapter 7: interfaces and generics — implicit interfaces, small interfaces, type switches, generics.
import { go, idea, tip, makeLesson } from "./gokit.mjs";

export default function interfaces(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi, short } = c;

  L({
    slug: "interfaces", title: "Интерфейсы", summary: "Неявная реализация, маленькие интерфейсы io.Reader и fmt.Stringer, принимай интерфейсы, возвращай структуры.",
    skill: ["go-interfaces", "Интерфейсы", "Описывать поведение интерфейсами."],
    now: "Собираем типы из структур и описываем поведение интерфейсами.",
    body: [
      go("interface", "Набор методов", "Интерфейс перечисляет методы. Тип реализует его автоматически, если у него есть эти методы — без слова implements.", "Код зависит от поведения, а не от конкретного типа.", "type Notifier interface {\n    Notify(msg string) error\n}\n\ntype Email struct{ To string }\n\nfunc (e Email) Notify(msg string) error { /* отправка */ return nil }"),
      idea("Маленькие интерфейсы", "Один-два метода", "io.Reader (Read), io.Writer (Write), fmt.Stringer (String). Чем меньше интерфейс, тем больше типов его реализуют.", "Функция, принимающая io.Reader, читает и файл, и сеть, и строку."),
      idea("Принимай интерфейсы", "Возвращай структуры", "Параметры функций — интерфейсы (что нужно), результаты — конкретные типы.", "Функцию легко тестировать подставным типом."),
      go("Stringer", "Как печатается", "Метод String() string делает тип красиво печатаемым в fmt.", "Уровень печатается словом.", "func (l Level) String() string {\n    return [...]string{\"Ученик\", \"Мастер\", \"Эксперт\"}[l]\n}"),
      tip("Интерфейсы маленькие и реализуются неявно. Принимай интерфейс, возвращай структуру.")
    ],
    quizzes: [
      single("if-implicit", "Реализация", "Как тип реализует интерфейс в Go?",
        [["implicit", "Автоматически, если у него есть все методы"], ["implements", "Словом implements"], ["extends", "Словом extends"], ["register", "Регистрацией в init"]], "implicit",
        "Неявная реализация."),
      single("if-reader", "io.Reader", "Почему функция, принимающая io.Reader, удобна?",
        [["any", "Читает из файла, сети, строки — из чего угодно с методом Read"], ["fast", "Она быстрее"], ["files", "Работает только с файлами"], ["none", "Не удобна"]], "any",
        "Маленький интерфейс — много реализаций."),
      single("if-stringer", "Печать", "Какой метод определяет, как fmt печатает твой тип?",
        [["string", "String() string"], ["print", "Print()"], ["tostring", "toString()"], ["format", "Format()"]], "string",
        "Интерфейс fmt.Stringer.")
    ]
  });

  L({
    slug: "type-switch", title: "Пустой интерфейс и проверки типов", summary: "any, утверждение типа v.(T) с ok, type switch, nil-интерфейс.",
    skill: ["go-typeswitch", "Проверки типов", "Работать с any и проверять конкретный тип."],
    now: "Описываем поведение интерфейсами и учимся узнавать конкретный тип.",
    body: [
      idea("any", "Что угодно", "any (interface{}) принимает значение любого типа. Нужен для JSON неизвестной формы и универсальных контейнеров.", "Используй редко: теряется проверка типов."),
      go("v.(T)", "Утверждение типа", "`s, ok := v.(string)` — достать строку, ok сообщает, удалось ли.", "Без ok при неверном типе — паника.", "if s, ok := value.(string); ok {\n    fmt.Println(\"строка:\", s)\n}"),
      go("type switch", "Выбор по типу", "`switch v := x.(type) { case int: … case string: … }`.", "Обработка значений разных типов в одном месте.", "switch v := value.(type) {\ncase int:\n    fmt.Println(\"число\", v)\ncase string:\n    fmt.Println(\"строка\", v)\ndefault:\n    fmt.Println(\"другое\")\n}"),
      idea("nil-интерфейс", "Ловушка", "Интерфейс с nil-указателем внутри не равен nil: у него есть тип. Функция, вернувшая `var p *MyErr = nil` как error, вернёт не-nil ошибку.", "Возвращай просто nil, а не типизированный nil-указатель."),
      tip("any — редко. Тип проверяй через `v, ok := x.(T)` или type switch.")
    ],
    quizzes: [
      single("tw-ok", "Без ok", "Что будет при `s := v.(string)`, если v — число?",
        [["panic", "Паника"], ["empty", "Пустая строка"], ["convert", "Число превратится в строку"], ["nil", "nil"]], "panic",
        "С ok — безопасно."),
      single("tw-switch", "Выбор", "Как обработать значение по-разному для int и string?",
        [["switch", "type switch: `switch v := x.(type)`"], ["typeof", "`typeof(x)`"], ["instanceof", "`x instanceof int`"], ["is", "`x is int`"]], "switch",
        "Каждый case получает v нужного типа."),
      single("tw-nil", "Ловушка", "Функция вернула типизированный nil-указатель как error. Будет ли err == nil?",
        [["no", "Нет, интерфейс хранит тип и не равен nil"], ["yes", "Да"], ["panic", "Паника"], ["compile", "Не скомпилируется"]], "no",
        "Возвращай просто nil.")
    ]
  });

  L({
    slug: "generics", title: "Обобщения", summary: "Параметры типов, ограничения any и comparable, cmp.Ordered, когда обобщения не нужны.",
    skill: ["go-generics", "Обобщения", "Писать обобщённые функции с ограничениями типов."],
    now: "Проверяем типы и пишем код, который работает с разными типами без any.",
    body: [
      go("Параметр типа", "[T any]", "Функция объявляет параметр типа в квадратных скобках и работает с любым подходящим типом, сохраняя проверку типов.", "Одна функция Map для срезов любых типов.", "func Map[T, R any](items []T, f func(T) R) []R {\n    out := make([]R, 0, len(items))\n    for _, it := range items {\n        out = append(out, f(it))\n    }\n    return out\n}"),
      go("Ограничения", "comparable и cmp.Ordered", "comparable — типы, которые можно сравнить ==, cmp.Ordered — которые можно сравнить < и >.", "Функция Max работает с числами и строками, но не со срезами.", "func Max[T cmp.Ordered](a, b T) T {\n    if a > b {\n        return a\n    }\n    return b\n}"),
      idea("Свой набор", "~int | ~float64", "Интерфейс-ограничение может перечислить типы: `type Number interface { ~int | ~float64 }`.", "Сумма для любых числовых типов."),
      idea("Не злоупотребляй", "Интерфейсы проще", "Если хватает обычного интерфейса — используй его. Обобщения — для контейнеров и алгоритмов над коллекциями.", "Код на Go ценят за простоту."),
      tip("Обобщения — для алгоритмов над коллекциями. Поведение — по-прежнему интерфейсами.")
    ],
    quizzes: [
      single("gn-syntax", "Синтаксис", "Как объявить параметр типа T у функции?",
        [["square", "`func F[T any](x T)`"], ["angle", "`func F<T>(x T)`"], ["paren", "`func F(T type, x T)`"], ["generic", "`generic func F(x T)`"]], "square",
        "Квадратные скобки."),
      single("gn-ordered", "Сравнение", "Какое ограничение нужно, чтобы сравнивать значения знаком <?",
        [["ordered", "cmp.Ordered"], ["any", "any"], ["comparable", "comparable"], ["error", "error"]], "ordered",
        "comparable — только ==."),
      single("gn-when", "Когда", "Когда обобщения особенно уместны?",
        [["algo", "Для контейнеров и алгоритмов над коллекциями"], ["always", "Всегда вместо интерфейсов"], ["never", "Никогда"], ["errors", "Для обработки ошибок"]], "algo",
        "Простота важнее.")
    ]
  });
}
