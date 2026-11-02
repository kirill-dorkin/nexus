// Chapter 7: The DOM — finding, reading, changing, creating elements.
import { scene, rule, meth, obj, kw, idea, run, has, task, makeLesson } from "./kit.mjs";

const MENU_PAGE = '<h1>Зерно</h1>\n<ul id="menu">\n  <li class="item" data-price="220">Латте</li>\n  <li class="item" data-price="290">Раф</li>\n  <li class="item sold" data-price="190">Какао</li>\n</ul>\n<p id="status">Загрузка…</p>';

export default function dom(c, ch, rc) {
  const L = makeLesson(c, ch, rc);
  const { single, multi, short } = c;

  L({
    slug: "dom-intro", title: "DOM и поиск элементов", summary: "Что такое DOM, document, querySelector, querySelectorAll и getElementById.",
    skill: ["js-dom-query", "Поиск элементов", "Находить элементы страницы из JavaScript."],
    now: "Чтобы оживить страницу, JavaScript должен найти на ней элементы. Знакомимся с DOM.",
    body: [
      scene("Дерево страницы",
        ["marta", "Как код «видит» мою страницу?"],
        ["bro", "Я читаю HTML и строю из него дерево объектов — DOM. Каждый тег — объект, с которым JavaScript может работать."]),
      idea("DOM", "Страница как дерево объектов", "Document Object Model: каждый элемент HTML — объект со свойствами и методами. Изменишь объект — изменится страница.", "Через DOM JavaScript читает и меняет страницу.", undefined),
      obj("document", "Вся страница", "Главный объект — вход в DOM.", "Отсюда начинается поиск.", 'console.log(document.title || "без заголовка", document.body.children.length);', { page: "<p>Абзац</p><p>Ещё</p>" }),
      meth("querySelector()", "Найти первый", "Принимает CSS-селектор и возвращает первый подходящий элемент или `null`.", "Найти кнопку, заголовок, поле.", 'const title = document.querySelector("h1");\nconsole.log(title.textContent);', { page: MENU_PAGE, show: 200 }),
      meth("querySelectorAll()", "Найти все", "Возвращает список (NodeList) всех подходящих элементов. Его можно перебрать `for…of` или `forEach`.", "Все карточки меню.", 'const items = document.querySelectorAll(".item");\nconsole.log(items.length);\nitems.forEach((li) => console.log(li.textContent));', { page: MENU_PAGE, show: 230 }),
      meth("getElementById()", "Найти по id", "Быстрый поиск по `id`, без решётки.", "Уникальные элементы.", 'console.log(document.getElementById("status").textContent);', { page: MENU_PAGE, show: 200 }),
      rule("Ищешь элемент — пиши селектор как в CSS. Не нашёл — вернётся `null`, проверь селектор.")
    ],
    tasks: [task("Найди элементы", "Найди заголовок `h1` в переменную `title`, все `.item` — в `items`, элемент с `id=\"status\"` — в `statusEl`.", {
      page: MENU_PAGE,
      start: "const title = null;\nconst items = [];\nconst statusEl = null;\n",
      checks: [run('title && title.tagName === "H1"', "`title` — заголовок"), run("items.length === 3", "Найдены три пункта"), run('statusEl && statusEl.id === "status"', "Найден статус")],
      solution: 'const title = document.querySelector("h1");\nconst items = document.querySelectorAll(".item");\nconst statusEl = document.getElementById("status");'
    })],
    quizzes: [
      single("js-qs-null", "Не нашёл", "Что вернёт `querySelector`, если ничего не нашлось?", [["null", "`null`"], ["undef", "`undefined`"], ["empty", "Пустой список"], ["error", "Ошибку"]], "null", "Отсюда частая ошибка «Cannot read properties of null»."),
      single("js-qsa", "Все", "Как найти все элементы с классом `item`?", [["qsa", "`document.querySelectorAll(\".item\")`"], ["qs", "`document.querySelector(\".item\")`"], ["id", "`document.getElementById(\"item\")`"], ["class", "`document.item`"]], "qsa", "querySelectorAll — все совпадения.")
    ]
  });

  L({
    slug: "dom-content", title: "Менять текст и разметку", summary: "textContent, innerHTML и почему innerHTML с данными пользователя опасен, value у полей.",
    skill: ["js-dom-content", "Содержимое элементов", "Менять текст и разметку элементов безопасно."],
    now: "Статус «Загрузка…» висит вечно. Меняем текст из кода.",
    body: [
      scene("Вечная загрузка",
        ["marta", "На сайте висит «Загрузка…», хотя всё давно загрузилось."],
        ["bug", "А давайте я в имя гостя впишу `<img src=x onerror=…>` — и через innerHTML запущу свой код!"],
        ["nika", "Поэтому для текста — только `textContent`. Он вставляет текст как текст, и трюк Вредного Скрипта не сработает."]),
      kw(".textContent", "Текст элемента", "Читает и меняет текст. Разметка внутри строки показывается буквально, а не выполняется.", "Безопасно выводить любые данные.", 'document.querySelector("#status").textContent = "Открыто до 22:00";', { page: '<p id="status">Загрузка…</p>' }),
      kw(".innerHTML", "HTML внутри элемента", "Читает и заменяет разметку внутри. Строка разбирается как HTML.", "Вставить свою, доверенную разметку. Никогда — данные от пользователя.", 'document.querySelector("#box").innerHTML = "<b>Хит</b> недели";', { page: '<p id="box"></p>' }),
      kw(".value", "Значение поля", "Текст в `<input>`, `<textarea>`, выбранное в `<select>`.", "Прочитать, что ввёл гость.", 'const input = document.querySelector("input");\nconsole.log(input.value);\ninput.value = "Аня";', { page: '<input value="Гость">' }),
      rule("Данные от людей — только через `textContent`. `innerHTML` — для своей разметки.")
    ],
    tasks: [task("Статус и безопасное имя", "Поставь в `#status` текст `Открыто`, а в `#guest` выведи значение переменной `guestName` безопасно — через `textContent`.", {
      page: '<p id="status">Загрузка…</p>\n<p>Гость: <span id="guest"></span></p>',
      start: 'const guestName = "<img src=x onerror=alert(1)>";\n',
      checks: [run('document.querySelector("#status").textContent === "Открыто"', "Статус обновлён"), run('document.querySelector("#guest").textContent === guestName && !document.querySelector("#guest img")', "Имя выведено как текст, без тегов"), has("textContent", "Использован `textContent`")],
      solution: 'const guestName = "<img src=x onerror=alert(1)>";\ndocument.querySelector("#status").textContent = "Открыто";\ndocument.querySelector("#guest").textContent = guestName;'
    })],
    quizzes: [
      single("js-textcontent-safe", "Безопасно", "Как вывести на страницу имя, которое ввёл гость?", [["text", "`el.textContent = name`"], ["html", "`el.innerHTML = name`"], ["write", "`document.write(name)`"], ["eval", "`eval(name)`"]], "text", "Иначе возможна XSS-атака."),
      single("js-input-value", "Поле", "Как прочитать текст, введённый в `<input>`?", [["value", "`input.value`"], ["text", "`input.textContent`"], ["html", "`input.innerHTML`"], ["val", "`input.val()`"]], "value", "У полей формы — `value`.")
    ]
  });

  L({
    slug: "dom-classes-styles", title: "Классы, стили и атрибуты", summary: "classList add/remove/toggle/contains, style, getAttribute, setAttribute, dataset и hidden.",
    skill: ["js-dom-classes", "Классы и атрибуты", "Менять внешний вид и атрибуты элементов из кода."],
    now: "Распроданные позиции должны становиться серыми, а цены браться из data-атрибутов.",
    body: [
      scene("Серые позиции",
        ["marta", "Какао закончилось — пусть позиция станет серой."],
        ["nika", "Стили пишем в CSS, а из JavaScript только включаем и выключаем классы. Так всё остаётся в своих местах."]),
      obj("classList", "Список классов", "`add`, `remove`, `toggle` (вкл/выкл), `contains` (есть ли).", "Состояния: выбран, распродан, открыт.", 'const li = document.querySelector("li");\nli.classList.add("sold");\nconsole.log(li.classList.contains("sold"));', { page: '<style>.sold{opacity:.4;text-decoration:line-through}</style><ul><li>Какао</li></ul>' }),
      kw(".style", "Инлайн-стиль", "`el.style.color = \"red\"` — стиль прямо в элемент. Имена через camelCase: `backgroundColor`.", "Значения, которые вычисляются в коде: ширина полосы прогресса.", 'document.querySelector(".bar").style.width = "70%";', { page: '<div style="background:#eee"><div class="bar" style="background:#c8763a;height:12px;width:10%"></div></div>' }),
      meth("getAttribute() · setAttribute()", "Атрибуты", "Прочитать и задать любой атрибут.", "Поменять ссылку, alt картинки.", 'const a = document.querySelector("a");\na.setAttribute("href", "#menu");\nconsole.log(a.getAttribute("href"));', { page: '<a href="#">Меню</a>' }),
      obj("dataset", "data-атрибуты", "`data-price=\"220\"` читается как `el.dataset.price` (строка).", "Хранить данные прямо в разметке.", 'const li = document.querySelector("li");\nconsole.log(Number(li.dataset.price) + 30);', { page: '<ul><li data-price="220">Латте</li></ul>' }),
      kw(".hidden", "Спрятать", "`el.hidden = true` — элемент скрыт (атрибут `hidden`).", "Показать и скрыть блок без CSS.", 'document.querySelector("#promo").hidden = true;\nconsole.log("Скрыт");', { page: '<p id="promo">Акция!</p>' }),
      rule("Вид — в CSS-классах. JavaScript только переключает классы.")
    ],
    tasks: [task("Распроданное и цены", "Добавь класс `sold` пункту с текстом «Какао», а в `total` посчитай сумму `data-price` всех `.item`, которые не `.sold`.", {
      page: '<ul id="menu">\n  <li class="item" data-price="220">Латте</li>\n  <li class="item" data-price="290">Раф</li>\n  <li class="item" data-price="190">Какао</li>\n</ul>',
      start: "let total = 0;\n",
      checks: [run('[...document.querySelectorAll(".item")].find((li) => li.textContent === "Какао").classList.contains("sold")', "Какао помечено `sold`"), run("total === 510", "Сумма доступных: 510"), has("dataset", "Цены из `dataset`"), has("classList", "Использован `classList`")],
      solution: 'const items = document.querySelectorAll(".item");\nfor (const li of items) {\n  if (li.textContent === "Какао") li.classList.add("sold");\n}\nlet total = 0;\nfor (const li of items) {\n  if (!li.classList.contains("sold")) total += Number(li.dataset.price);\n}'
    })],
    quizzes: [
      single("js-toggle", "toggle", "Что делает `el.classList.toggle(\"open\")`?", [["switch", "Добавляет класс, если его нет, и убирает, если есть"], ["add", "Только добавляет"], ["remove", "Только убирает"], ["check", "Проверяет наличие"]], "switch", "Переключатель."),
      single("js-dataset", "dataset", "Как прочитать атрибут `data-size=\"L\"`?", [["ds", "`el.dataset.size`"], ["data", "`el.data.size`"], ["size", "`el.size`"], ["attr", "`el.attr(\"size\")`"]], "ds", "data-* → dataset.")
    ]
  });

  L({
    slug: "dom-create", title: "Создать и удалить элементы", summary: "createElement, append, prepend, remove, replaceChildren и сборка списка из массива.",
    skill: ["js-dom-create", "Создание элементов", "Строить разметку из данных и удалять элементы."],
    now: "Меню теперь хранится в массиве. Собираем список на странице прямо из данных.",
    body: [
      scene("Меню из данных",
        ["marta", "Каждый раз, когда меняется меню, я правлю HTML руками."],
        ["nika", "Пусть меню живёт в массиве, а страница строится из него. Поменяла массив — поменялся сайт."]),
      meth("createElement()", "Создать элемент", "`document.createElement(\"li\")` — новый элемент, пока не на странице.", "Карточки, строки, пункты списка из данных.", 'const li = document.createElement("li");\nli.textContent = "Латте";\ndocument.querySelector("ul").append(li);', { page: "<ul></ul>" }),
      meth("append() · prepend()", "Вставить", "`parent.append(el)` — в конец, `prepend` — в начало. Можно передать строку — вставится как текст.", "Добавить новый заказ в список.", 'const ul = document.querySelector("ul");\nul.append("Раф");\nul.prepend("Сначала: ");', { page: "<ul></ul>" }),
      meth("remove()", "Удалить", "`el.remove()` — элемент исчезает со страницы.", "Убрать позицию из корзины.", 'document.querySelector(".old").remove();\nconsole.log(document.querySelectorAll("li").length);', { page: '<ul><li>Латте</li><li class="old">Старая акция</li></ul>' }),
      meth("replaceChildren()", "Заменить всё содержимое", "Удаляет всех детей и вставляет новых. Без аргументов — очищает.", "Перерисовать список целиком.", 'document.querySelector("ul").replaceChildren();\nconsole.log("Пусто");', { page: "<ul><li>1</li><li>2</li></ul>" }),
      rule("Данные — в массиве, страница — из данных. Не храни правду в HTML.")
    ],
    tasks: [task("Меню из массива", "Для каждого напитка из `drinks` создай `<li>` с текстом вида `Латте — 220 ₽` и добавь его в `#menu`.", {
      page: '<ul id="menu"></ul>',
      start: 'const drinks = [\n  { name: "Латте", price: 220 },\n  { name: "Раф", price: 290 }\n];\n',
      checks: [run('document.querySelectorAll("#menu li").length === 2', "Два пункта"), run('document.querySelector("#menu li").textContent === "Латте — 220 ₽"', "Текст пункта"), has("createElement", "Использован `createElement`")],
      solution: 'const drinks = [\n  { name: "Латте", price: 220 },\n  { name: "Раф", price: 290 }\n];\nconst menu = document.querySelector("#menu");\nfor (const d of drinks) {\n  const li = document.createElement("li");\n  li.textContent = `${d.name} — ${d.price} ₽`;\n  menu.append(li);\n}'
    })],
    quizzes: [
      single("js-create-visible", "Видно ли", "Появится ли на странице элемент сразу после `document.createElement(\"li\")`?", [["no", "Нет, пока его не вставят через append"], ["yes", "Да, сразу в конце body"], ["top", "Да, в начале страницы"], ["error", "Будет ошибка"]], "no", "Созданный элемент сначала живёт только в памяти."),
      single("js-remove", "Удалить", "Как удалить элемент `el` со страницы?", [["remove", "`el.remove()`"], ["delete", "`delete el`"], ["null", "`el = null`"], ["hide", "`el.hide()`"]], "remove", "`remove()` убирает его из DOM.")
    ]
  });

  L({
    slug: "dom-traversal", title: "Навигация по дереву", summary: "parentElement, children, closest, nextElementSibling и matches.",
    skill: ["js-dom-traversal", "Навигация по DOM", "Переходить от элемента к соседям, детям и родителям."],
    now: "Нажали «Убрать» в карточке — надо удалить всю карточку. Ищем родителя.",
    body: [
      scene("Вся карточка",
        ["marta", "Кнопка «Убрать» внутри карточки. Удалить надо карточку целиком, а не кнопку."],
        ["bro", "От кнопки поднимись к ближайшему предку-карточке: `closest(\".card\")`."]),
      kw(".parentElement", "Родитель", "Элемент, внутри которого лежит текущий.", "Подняться на уровень выше.", 'const b = document.querySelector("b");\nconsole.log(b.parentElement.tagName);', { page: "<p>Цена: <b>220</b></p>" }),
      kw(".children", "Дети", "Коллекция дочерних элементов.", "Перебрать пункты списка.", 'console.log(document.querySelector("ul").children.length);', { page: "<ul><li>1</li><li>2</li><li>3</li></ul>" }),
      meth("closest()", "Ближайший предок по селектору", "Поднимается вверх, пока не найдёт подходящий элемент (включая сам элемент).", "Карточка, в которой нажали кнопку.", 'const btn = document.querySelector("button");\nconsole.log(btn.closest(".card").dataset.id);', { page: '<div class="card" data-id="7"><p><button>Убрать</button></p></div>' }),
      kw(".nextElementSibling", "Следующий сосед", "Элемент, стоящий сразу после. Есть и `previousElementSibling`.", "Раскрывающиеся блоки: заголовок и ответ под ним.", 'console.log(document.querySelector("dt").nextElementSibling.textContent);', { page: "<dl><dt>Латте</dt><dd>Эспрессо и молоко</dd></dl>" }),
      meth("matches()", "Подходит ли под селектор", "`el.matches(\".sold\")` → true или false.", "Проверить элемент в обработчике.", 'console.log(document.querySelector("li").matches(".sold"));', { page: '<ul><li class="sold">Какао</li></ul>' }),
      rule("От кнопки до её карточки — `closest`. Это надёжнее цепочки `parentElement.parentElement`.")
    ],
    tasks: [task("Убрать карточку", "Найди кнопку внутри карточки с `data-id=\"2\"` и удали всю эту карточку через `closest(\".card\")`.", {
      page: '<div class="card" data-id="1"><p>Латте</p><button>Убрать</button></div>\n<div class="card" data-id="2"><p>Раф</p><button>Убрать</button></div>',
      start: 'const btn = document.querySelector(\'[data-id="2"] button\');\n',
      checks: [run('!document.querySelector(\'[data-id="2"]\')', "Карточка 2 удалена"), run('document.querySelectorAll(".card").length === 1', "Карточка 1 осталась"), has("closest", "Использован `closest`")],
      solution: 'const btn = document.querySelector(\'[data-id="2"] button\');\nbtn.closest(".card").remove();'
    })],
    quizzes: [
      single("js-closest", "closest", "Что вернёт `el.closest(\".card\")`?", [["ancestor", "Ближайший предок (или сам el) с классом card"], ["child", "Первого ребёнка с классом card"], ["sibling", "Соседа"], ["all", "Все .card на странице"]], "ancestor", "Поиск идёт вверх по дереву."),
      single("js-children", "children", "Чем `children` отличается от `querySelectorAll(\"*\")`?", [["direct", "Только прямые дети, без вложенных глубже"], ["same", "Ничем"], ["text", "Включает текстовые узлы"], ["parent", "Возвращает родителей"]], "direct", "querySelectorAll ищет на любой глубине.")
    ]
  });
}
