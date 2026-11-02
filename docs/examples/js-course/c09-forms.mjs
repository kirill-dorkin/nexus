// Chapter 9: Forms.
import { scene, rule, meth, ev, obj, idea, run, has, task, makeLesson } from "./kit.mjs";

const submit = 'document.querySelector("form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))';
const FORM = '<form id="signup">\n  <label>Имя <input name="user"></label>\n  <label>Телефон <input name="phone"></label>\n  <select name="course"><option>HTML</option><option>CSS</option></select>\n  <button>Записаться</button>\n</form>\n<p id="msg"></p>';

export default function forms(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "form-submit", title: "Отправка формы", summary: "Событие submit, preventDefault, чтение полей через form.elements.",
    skill: ["js-form-submit", "Отправка формы", "Перехватывать отправку формы и читать введённые данные."],
    now: "Перехватываем отправку формы и читаем введённые данные.",
    body: [
      scene("Всё пропало",
        ["you", "Пользователь заполнил форму, нажал «Записаться» — страница перезагрузилась, и всё пропало!"],
        ["nika", "Форма по умолчанию отправляется и перезагружает страницу. Перехватим `submit` и обработаем сами."]),
      ev("submit", "Форму отправляют", "Срабатывает на `<form>` при нажатии кнопки отправки или Enter в поле.", "Одно место для обработки формы — не клик по кнопке.", 'document.querySelector("form").addEventListener("submit", (e) => {\n  e.preventDefault();\n  console.log("Отправка перехвачена");\n});\ndocument.querySelector("button").click();', { page: "<form><input value=\"HTML\"><button>Записаться</button></form>" }),
      obj("form.elements", "Поля формы", "Доступ к полям по `name`: `form.elements.user.value`.", "Прочитать конкретное поле.", 'const form = document.querySelector("form");\nconsole.log(form.elements.user.value);', { page: '<form><input name="user" value="Аня"></form>' }),
      rule("Слушай `submit` на форме, а не `click` на кнопке: так работает и Enter, и любая кнопка.")
    ],
    tasks: [task("Перехват отправки", "На `submit` формы отмени перезагрузку и выведи в `#msg` строку `Аня, вы записаны на HTML` из полей `user` и `course`.", {
      page: FORM,
      start: "",
      checks: [run(`(() => { const f = document.querySelector("form"); f.elements.user.value = "Аня"; const e = new Event("submit", { bubbles: true, cancelable: true }); f.dispatchEvent(e); return e.defaultPrevented; })()`, "Перезагрузки нет"), run('document.querySelector("#msg").textContent === "Аня, вы записаны на HTML"', "Сообщение собрано из полей"), has("submit", "Слушаем `submit`")],
      solution: 'const form = document.querySelector("#signup");\nform.addEventListener("submit", (event) => {\n  event.preventDefault();\n  const user = form.elements.user.value;\n  const course = form.elements.course.value;\n  document.querySelector("#msg").textContent = `${user}, вы записаны на ${course}`;\n});'
    })],
    quizzes: [
      single("js-submit-where", "Где слушать", "На каком элементе правильно слушать отправку формы?", [["form", "На `<form>`, событие submit"], ["button", "На кнопке, событие click"], ["input", "На каждом поле"], ["body", "На body, событие load"]], "form", "submit ловит и Enter, и кнопку."),
      single("js-submit-reload", "Перезагрузка", "Как не дать форме перезагрузить страницу?", [["prevent", "`event.preventDefault()` в обработчике submit"], ["return", "Убрать кнопку"], ["stop", "`event.stopPropagation()`"], ["action", "Удалить атрибут name"]], "prevent", "Отменяем действие по умолчанию.")
    ]
  });

  L({
    slug: "form-validation", title: "Проверка формы", summary: "Своя проверка полей, сообщения об ошибках, checkValidity, setCustomValidity и aria-invalid.",
    skill: ["js-form-validation", "Проверка полей", "Проверять ввод и понятно сообщать об ошибках."],
    now: "Проверяем поля формы и понятно сообщаем об ошибках.",
    body: [
      scene("Без телефона",
        ["you", "Пришла заявка без телефона. Куда звонить?"],
        ["lev", "И пожалуйста: если ошибка — скажите текстом, рядом с полем. Красную рамку я не вижу."]),
      idea("Своя проверка", "Проверить перед отправкой", "В обработчике submit проверяем значения; если что-то не так — `preventDefault` и показываем ошибку.", "Правила, которых нет в HTML-атрибутах.", undefined),
      meth("checkValidity()", "Проверка по HTML-правилам", "`form.checkValidity()` — true, если все поля проходят `required`, `type`, `pattern`.", "Использовать встроенную проверку браузера.", 'const input = document.querySelector("input");\nconsole.log(input.checkValidity());', { page: "<input required>" }),
      meth("setCustomValidity()", "Своё сообщение", "`input.setCustomValidity(\"Нужен телефон\")` — браузер покажет этот текст; пустая строка — ошибок нет.", "Понятные сообщения на своём языке.", undefined),
      idea("aria-invalid", "Ошибка для скринридера", "`aria-invalid=\"true\"` на поле и текст ошибки, связанный через `aria-describedby`.", "Чтобы об ошибке узнал каждый.", undefined),
      rule("Ошибка должна быть текстом рядом с полем, а не только красной рамкой.")
    ],
    tasks: [task("Нужен телефон", "При отправке: если в `phone` меньше 10 цифр — отмени отправку, покажи в `#error` текст `Укажите телефон` и поставь полю `aria-invalid=\"true\"`. Иначе очисти `#error`.", {
      page: '<form>\n  <input name="phone" aria-describedby="error">\n  <button>Записаться</button>\n</form>\n<p id="error"></p>',
      start: "",
      checks: [run(`(() => { const f = document.querySelector("form"); f.elements.phone.value = "123"; ${submit}; return document.querySelector("#error").textContent === "Укажите телефон"; })()`, "Короткий телефон — ошибка"), run('document.querySelector("[name=phone]").getAttribute("aria-invalid") === "true"', "Поле помечено для скринридера"), run(`(() => { const f = document.querySelector("form"); f.elements.phone.value = "+7 999 123-45-67"; ${submit}; return document.querySelector("#error").textContent === ""; })()`, "Верный телефон — без ошибки")],
      solution: 'const form = document.querySelector("form");\nconst error = document.querySelector("#error");\nform.addEventListener("submit", (event) => {\n  const phone = form.elements.phone;\n  const digits = phone.value.replace(/\\D/g, "");\n  if (digits.length < 10) {\n    event.preventDefault();\n    error.textContent = "Укажите телефон";\n    phone.setAttribute("aria-invalid", "true");\n  } else {\n    event.preventDefault();\n    error.textContent = "";\n    phone.removeAttribute("aria-invalid");\n  }\n});'
    })],
    quizzes: [
      single("js-validity", "checkValidity", "Что возвращает `form.checkValidity()`?", [["bool", "true, если все поля проходят встроенные правила"], ["list", "Список ошибок"], ["submit", "Отправляет форму"], ["text", "Текст ошибки"]], "bool", "Проверка по required, type, pattern."),
      single("js-error-a11y", "Доступно", "Как сделать ошибку в поле понятной для всех?", [["text", "Текст ошибки рядом с полем и aria-invalid"], ["red", "Только красная рамка"], ["alert", "Только alert()"], ["console", "console.error"]], "text", "Цвет видят не все.")
    ]
  });

  L({
    slug: "formdata", title: "FormData: все поля сразу", summary: "new FormData(form), get, перебор и Object.fromEntries для превращения формы в объект.",
    skill: ["js-formdata", "FormData", "Собирать все поля формы в объект одной строкой."],
    now: "Собираем все поля формы в объект одной строкой — FormData.",
    body: [
      scene("Десять полей",
        ["you", "В форме уже адрес, комментарий, способ оплаты… Читать каждое поле по отдельности?"],
        ["bro", "Отдай форму в `FormData` — я соберу все поля с `name` сам."]),
      obj("FormData", "Все поля формы", "`new FormData(form)` — набор пар «name — значение» всех полей с атрибутом `name`.", "Отправить форму на сервер или собрать объект.", 'const data = new FormData(document.querySelector("form"));\nconsole.log(data.get("course"), data.get("size"));', { page: '<form><input name="course" value="CSS"><input name="size" value="L"></form>' }),
      idea("Форма → объект", "Object.fromEntries(FormData)", "`Object.fromEntries(new FormData(form))` превращает форму в обычный объект.", "Дальше работаешь как с любым объектом.", 'const form = document.querySelector("form");\nconsole.log(Object.fromEntries(new FormData(form)));', { page: '<form><input name="course" value="CSS"><input name="qty" value="2"></form>' }),
      rule("Без `name` поле не попадёт ни в FormData, ни на сервер.")
    ],
    tasks: [task("Заявка объектом", "При отправке формы собери все поля в объект `lastSignup` через `FormData` и `Object.fromEntries` (и отмени перезагрузку).", {
      page: FORM,
      start: "let lastSignup = null;\n",
      checks: [run(`(() => { const f = document.querySelector("form"); f.elements.user.value = "Борис"; f.elements.phone.value = "89990001122"; f.elements.course.value = "CSS"; ${submit}; return lastSignup && lastSignup.user === "Борис" && lastSignup.course === "CSS" && lastSignup.phone === "89990001122"; })()`, "Все поля собраны"), has("FormData", "Использован `FormData`")],
      solution: 'let lastSignup = null;\nconst form = document.querySelector("#signup");\nform.addEventListener("submit", (event) => {\n  event.preventDefault();\n  lastSignup = Object.fromEntries(new FormData(form));\n});'
    })],
    quizzes: [
      single("js-formdata-name", "name", "Какое поле не попадёт в `FormData`?", [["noname", "Поле без атрибута name"], ["empty", "Пустое поле"], ["select", "Select"], ["textarea", "Textarea"]], "noname", "FormData собирает поля по name."),
      single("js-fromentries", "В объект", "Как превратить `FormData` в обычный объект?", [["from", "`Object.fromEntries(formData)`"], ["json", "`JSON.parse(formData)`"], ["obj", "`formData.toObject()`"], ["spread", "`{ formData }`"]], "from", "FormData — это набор пар.")
    ]
  });
}
