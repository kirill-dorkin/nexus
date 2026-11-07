// Chapter 5: events and forms — event handlers, controlled inputs, form submission, validation, accessibility.
import { idea, jsx, tip, makeLesson } from "./rkit.mjs";

export default function forms(c, rc) {
  const L = makeLesson(c, rc);
  const { single, short } = c;

  L({
    slug: "events", title: "События", summary: "onClick и другие обработчики, передача функции а не вызова, объект события и preventDefault.",
    skill: ["react-events", "События", "Обрабатывать события в компонентах."],
    now: "Проектируем состояние и связываем его с действиями пользователя.",
    body: [
      jsx("Обработчик события", "onClick={функция}", "Передают саму функцию: `onClick={handleClick}` или стрелку `onClick={() => select(id)}`. Не вызов: `onClick={handleClick()}` выполнится сразу при рендере.", "Самая частая ошибка: функция срабатывает при загрузке, а не по клику.", "<button onClick={() => addToCart(course)}>В корзину</button>"),
      idea("Объект события", "e", "Обработчик получает событие: `e.target`, `e.key`, `e.preventDefault()`. Это обёртка React над событием браузера с тем же API.", "Знания событий из курса JavaScript работают и здесь."),
      idea("Имена обработчиков", "handle и on", "Внутри компонента функцию называют `handleClick`, а prop для неё снаружи — `onClick`.", "Сразу видно, где обработчик определён, а где передан."),
      tip("В onClick — функция, а не её вызов. Аргументы — через стрелку.")
    ],
    quizzes: [
      single("ev-call", "Вызов", "Что не так с `<button onClick={save()}>`?",
        [["now", "save вызовется при рендере, а не по клику"], ["ok", "Всё правильно"], ["syntax", "Синтаксическая ошибка"], ["twice", "save вызовется дважды по клику"]], "now",
        "Нужно onClick={save} или onClick={() => save()}."),
      single("ev-arg", "С аргументом", "Как вызвать select(id) по клику?",
        [["arrow", "`onClick={() => select(id)}`"], ["direct", "`onClick={select(id)}`"], ["string", "`onClick=\"select(id)\"`"], ["bind", "Это невозможно"]], "arrow",
        "Стрелка создаёт функцию, которая вызовется по клику."),
      short("ev-prevent", "Отменить", "Какой метод события отменяет действие браузера по умолчанию, например отправку формы?", ["preventDefault", "e.preventDefault()", "preventDefault()"],
        "e.preventDefault().")
    ]
  });

  L({
    slug: "controlled", title: "Управляемые поля", summary: "value и onChange, состояние формы одним объектом, чекбоксы и select.",
    skill: ["react-controlled", "Управляемые поля", "Связывать поля формы с состоянием."],
    now: "Обрабатываем события и подключаем к состоянию поля ввода.",
    body: [
      jsx("Управляемое поле", "value + onChange", "Значение поля берётся из состояния, а каждое изменение записывается обратно: `<input value={email} onChange={(e) => setEmail(e.target.value)} />`.", "Состояние всегда знает, что введено: можно проверять, форматировать, блокировать кнопку.", "const [email, setEmail] = useState(\"\");\n<input value={email} onChange={(e) => setEmail(e.target.value)} />"),
      jsx("Форма одним объектом", "name и обновление поля", "Для многих полей — один объект состояния и общий обработчик по атрибуту name.", "Не нужно заводить отдельный useState на каждое поле.", "const [form, setForm] = useState({ name: \"\", email: \"\" });\nconst onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });"),
      idea("Чекбокс и select", "checked и value", "У чекбокса связывают `checked` и `e.target.checked`; у select — `value` как у input.", "Все поля формы работают по одному принципу."),
      idea("Неуправляемое поле", "defaultValue и FormData", "Иногда поле не связывают с состоянием: задают `defaultValue`, а значения читают при отправке через `new FormData(form)`.", "Проще для больших форм без живой проверки."),
      tip("Нужна живая проверка — управляемое поле. Просто отправить — FormData при submit.")
    ],
    quizzes: [
      single("ct-what", "Управляемое", "Что значит «управляемое поле»?",
        [["state", "Его value берётся из состояния, а onChange обновляет состояние"], ["css", "Поле со стилями"], ["server", "Поле, которое проверяет сервер"], ["readonly", "Поле только для чтения"]], "state",
        "Состояние — источник правды."),
      single("ct-frozen", "Не вводится", "Поле с `value={email}` не реагирует на ввод. Чего не хватает?",
        [["onchange", "onChange, который обновляет состояние"], ["name", "Атрибута name"], ["type", "Атрибута type"], ["form", "Тега form"]], "onchange",
        "Без onChange значение всегда равно состоянию."),
      single("ct-check", "Чекбокс", "Какое свойство события читают у чекбокса?",
        [["checked", "`e.target.checked`"], ["value", "`e.target.value`"], ["selected", "`e.target.selected`"], ["on", "`e.target.on`"]], "checked",
        "value у чекбокса не меняется при нажатии.")
    ]
  });

  L({
    slug: "submit-validate", title: "Отправка и проверка формы", summary: "onSubmit, preventDefault, проверка полей, сообщения об ошибках и доступность формы.",
    skill: ["react-form-submit", "Отправка формы", "Отправлять формы с проверкой и понятными ошибками."],
    now: "Связали поля с состоянием и доводим форму до отправки.",
    body: [
      jsx("onSubmit", "Отправка формы", "Обработчик вешают на форму, а не на кнопку: так работает и Enter. Первым делом — `e.preventDefault()`, чтобы страница не перезагрузилась.", "Форма отправляется одинаково с клавиатуры и мышью.", "<form onSubmit={(e) => { e.preventDefault(); save(form); }}>\n  …\n  <button type=\"submit\">Сохранить</button>\n</form>"),
      idea("Проверка", "Перед отправкой", "Ошибки собирают в объект `{ email: \"Неверный адрес\" }` и показывают рядом с полями. Для сложных форм используют react-hook-form со схемой Zod.", "Пользователь видит, что исправить, до запроса на сервер. Сервер всё равно проверяет снова."),
      idea("Доступная форма", "label и aria", "У каждого поля — `<label htmlFor>`; ошибка связана с полем через `aria-describedby`, а поле с ошибкой — `aria-invalid`.", "Скринридер прочитает, что за поле и что с ним не так."),
      idea("Состояние отправки", "Кнопка не жмётся дважды", "Во время запроса кнопка показывает «Сохраняем…» и становится disabled.", "Двойная отправка заказа или комментария исчезает."),
      tip("onSubmit на форме + preventDefault, ошибки рядом с полями, кнопка заблокирована на время запроса.")
    ],
    quizzes: [
      single("sv-where", "Куда вешать", "Куда лучше вешать обработчик отправки?",
        [["form", "На форму: onSubmit"], ["button", "На кнопку: onClick"], ["input", "На каждое поле"], ["window", "На window"]], "form",
        "Так срабатывает и Enter."),
      single("sv-reload", "Перезагрузка", "Почему после отправки формы страница перезагружается?",
        [["prevent", "Не вызван e.preventDefault()"], ["react", "Так всегда в React"], ["button", "Кнопка без onClick"], ["server", "Сервер вернул ошибку"]], "prevent",
        "Браузер по умолчанию отправляет форму и перезагружает страницу."),
      single("sv-a11y", "Доступность", "Как связать сообщение об ошибке с полем для скринридера?",
        [["describedby", "aria-describedby на поле с id сообщения"], ["color", "Покрасить поле в красный"], ["title", "Атрибут title"], ["alert", "window.alert"]], "describedby",
        "Цвет скринридер не увидит.")
    ]
  });
}
