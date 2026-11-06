// Chapter 5: forms and Server Actions — "use server", validation, pending and optimistic UI.
import { idea, nx, tip, makeLesson } from "./nxkit.mjs";

export default function actions(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi, short } = c;

  L({
    slug: "server-actions", title: "Server Actions", summary: "\"use server\", форма с action, FormData, revalidatePath и redirect.",
    skill: ["nx-actions", "Server Actions", "Изменять данные формами и Server Actions."],
    now: "Получаем данные и учимся их менять без отдельного API.",
    body: [
      nx("\"use server\"", "Функция на сервере", "Асинхронная функция с директивой \"use server\" выполняется на сервере, а вызывается из формы или кнопки.", "Не нужен отдельный обработчик API для каждой формы.", "// app/actions.ts\n\"use server\";\nimport { revalidatePath } from \"next/cache\";\n\nexport async function addComment(formData: FormData) {\n  const text = String(formData.get(\"text\") ?? \"\");\n  await db.comment.create({ data: { text } });\n  revalidatePath(\"/blog\");\n}"),
      nx("form action", "Форма вызывает действие", "`<form action={addComment}>` — данные полей приходят в FormData. Форма работает даже до загрузки JavaScript.", "Простейший и надёжный путь отправки данных.", "<form action={addComment}>\n  <textarea name=\"text\" required />\n  <button>Отправить</button>\n</form>"),
      idea("revalidatePath", "Обновить страницу", "После изменения данных говорим, какие страницы показать заново: revalidatePath(\"/blog\").", "Новый комментарий сразу появляется в списке."),
      idea("redirect", "Перейти после действия", "redirect(\"/orders/42\") из next/navigation отправляет на другую страницу после успешного сохранения.", "После оформления заказа — страница заказа."),
      tip("Изменение данных — Server Action. После изменения — revalidatePath или redirect.")
    ],
    quizzes: [
      single("sa-dir", "Директива", "Какая директива делает функцию Server Action?",
        [["server", "\"use server\""], ["client", "\"use client\""], ["action", "\"use action\""], ["api", "\"use api\""]], "server",
        "В начале файла или функции."),
      single("sa-data", "Данные формы", "В каком виде действие получает данные формы?",
        [["formdata", "FormData"], ["json", "Строка JSON"], ["event", "Событие submit"], ["state", "Состояние React"]], "formdata",
        "formData.get(\"имя поля\")."),
      single("sa-reval", "Обновление", "Зачем вызывать revalidatePath после сохранения?",
        [["fresh", "Чтобы страница показала новые данные"], ["delete", "Чтобы удалить кэш браузера"], ["auth", "Для входа"], ["log", "Для логов"]], "fresh",
        "Иначе может показаться старая версия.")
    ]
  });

  L({
    slug: "validation", title: "Проверка данных", summary: "Сервер не доверяет форме: схема Zod, ошибки полей через useActionState, проверка прав.",
    skill: ["nx-validate", "Проверка форм", "Проверять данные форм на сервере и показывать ошибки."],
    now: "Отправляем формы и защищаемся от неверных данных.",
    body: [
      idea("Не доверяй форме", "Проверка на сервере", "Server Action — публичная точка входа: её можно вызвать с любыми данными, минуя форму. Проверка в браузере — только для удобства.", "Злоумышленник отправит что угодно, не открывая твою форму."),
      nx("Zod", "Схема данных", "Схема описывает, какие данные допустимы, а safeParse возвращает либо данные, либо ошибки по полям.", "Одна схема для проверки и типов TypeScript.", "import { z } from \"zod\";\n\nconst Signup = z.object({\n  email: z.string().email(),\n  name: z.string().min(2)\n});\nconst result = Signup.safeParse(Object.fromEntries(formData));"),
      nx("useActionState", "Ошибки в форме", "Хук хранит результат последнего вызова действия: ошибки полей, сообщение об успехе.", "Пользователь видит, что исправить, рядом с полем.", "\"use client\";\nconst [state, formAction, pending] = useActionState(signup, { errors: {} });\n\n<form action={formAction}>\n  <input name=\"email\" />\n  {state.errors.email && <p>{state.errors.email}</p>}\n</form>"),
      idea("Права", "Кто вызывает", "Внутри действия проверяют, вошёл ли пользователь и может ли он менять эту запись.", "Иначе любой удалит чужой комментарий."),
      tip("Каждое действие: проверь вход, права и данные по схеме.")
    ],
    quizzes: [
      single("va-trust", "Доверие", "Достаточно ли проверки required в HTML-форме?",
        [["no", "Нет, действие можно вызвать в обход формы — нужна проверка на сервере"], ["yes", "Да, браузер всё проверит"], ["https", "Да, если сайт на HTTPS"], ["ts", "Да, если есть TypeScript"]], "no",
        "Сервер проверяет всегда."),
      single("va-zod", "safeParse", "Что возвращает schema.safeParse(data)?",
        [["result", "Успех с данными или ошибки по полям"], ["throw", "Всегда бросает исключение"], ["bool", "Только true или false"], ["string", "Строку JSON"]], "result",
        "parse — бросает исключение."),
      single("va-state", "Ошибки", "Какой хук хранит результат действия для показа ошибок?",
        [["action", "useActionState"], ["state", "useState"], ["effect", "useEffect"], ["form", "useForm из React"]], "action",
        "Третий элемент — pending.")
    ]
  });

  L({
    slug: "pending-optimistic", title: "Отклик интерфейса", summary: "useFormStatus и кнопка отправки, useOptimistic, обработка ошибок действия.",
    skill: ["nx-optimistic", "Отзывчивые формы", "Показывать ожидание и оптимистичные обновления."],
    now: "Проверяем данные и делаем формы отзывчивыми.",
    body: [
      nx("useFormStatus", "Кнопка знает о отправке", "Хук внутри формы возвращает pending — пока действие выполняется.", "Кнопка блокируется, и форму не отправят дважды.", "\"use client\";\nimport { useFormStatus } from \"react-dom\";\n\nexport function Submit() {\n  const { pending } = useFormStatus();\n  return <button disabled={pending}>{pending ? \"Сохраняем…\" : \"Сохранить\"}</button>;\n}"),
      nx("useOptimistic", "Сразу показать результат", "Интерфейс показывает ожидаемый результат до ответа сервера, а при ошибке возвращается назад.", "Лайк и новое сообщение появляются мгновенно.", "const [optimistic, addOptimistic] = useOptimistic(messages, (list, m) => [...list, m]);"),
      idea("Ошибки действия", "Не роняй страницу", "Ожидаемые ошибки (неверный ввод, нет прав) возвращают объектом состояния. Неожиданные ловит error.tsx.", "Пользователь видит понятное сообщение, а не белый экран."),
      tip("Ожидание — useFormStatus, мгновенный отклик — useOptimistic, ожидаемые ошибки — в состоянии.")
    ],
    quizzes: [
      single("po-status", "Ожидание", "Какой хук сообщает кнопке, что форма отправляется?",
        [["status", "useFormStatus"], ["pending", "usePending"], ["loading", "useLoading"], ["submit", "useSubmit"]], "status",
        "Из react-dom."),
      single("po-optimistic", "Оптимизм", "Что делает useOptimistic?",
        [["instant", "Показывает ожидаемый результат до ответа сервера"], ["cache", "Кэширует страницу"], ["retry", "Повторяет запрос"], ["block", "Блокирует форму"]], "instant",
        "При ошибке откатывается."),
      single("po-errors", "Ошибки", "Как лучше вернуть ошибку «неверный email» из действия?",
        [["state", "Объектом состояния, который покажет форма"], ["throw", "Бросить исключение и показать белый экран"], ["alert", "Через alert на сервере"], ["log", "Только записать в лог"]], "state",
        "error.tsx — для неожиданных.")
    ]
  });
}
