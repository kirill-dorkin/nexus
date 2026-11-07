// Chapter 6: lists and conditions — v-if/v-show, v-for and keys, transitions.
import { vue, idea, tip, makeLesson } from "./vkit.mjs";

export default function lists(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "conditions", title: "Условия", summary: "v-if, v-else-if, v-else, v-show и разница между ними, template как обёртка.",
    skill: ["vue-if", "Условия в шаблоне", "Показывать и скрывать части интерфейса по условию."],
    now: "Проверяем формы и показываем разные части интерфейса по условию.",
    body: [
      vue("v-if", "Есть или нет", "Элемент создаётся, только если условие истинно. v-else-if и v-else идут сразу следом.", "Загрузка, ошибка или данные — три состояния одного блока.", "<p v-if=\"loading\">Загружаем…</p>\n<p v-else-if=\"error\">{{ error }}</p>\n<CourseList v-else :courses=\"courses\" />"),
      vue("v-show", "Скрыть, но оставить", "Элемент всегда в DOM, условие лишь включает display: none.", "Для того, что часто переключается: вкладки, раскрывающиеся панели."),
      idea("v-if или v-show", "Цена", "v-if дешевле при старте и дороже при переключении, v-show — наоборот.", "Редко меняется — v-if, часто — v-show."),
      vue("template", "Обёртка без тега", "`<template v-if=\"…\">` группирует несколько элементов без лишнего div.", "Чистая разметка."),
      tip("Три состояния — v-if / v-else-if / v-else. Частое переключение — v-show.")
    ],
    quizzes: [
      single("cn-show", "v-show", "Что делает v-show при ложном условии?",
        [["hide", "Оставляет элемент в DOM, скрывая через display: none"], ["remove", "Удаляет элемент из DOM"], ["error", "Ошибка"], ["opacity", "Делает прозрачным"]], "hide",
        "v-if удаляет."),
      single("cn-tabs", "Вкладки", "Что лучше для вкладок, которые переключают постоянно?",
        [["show", "v-show"], ["if", "v-if"], ["for", "v-for"], ["model", "v-model"]], "show",
        "Переключение дешёвое."),
      single("cn-else", "v-else", "Где должен стоять элемент с v-else?",
        [["next", "Сразу после элемента с v-if или v-else-if"], ["any", "Где угодно"], ["first", "Перед v-if"], ["parent", "В родителе"]], "next",
        "Иначе Vue не свяжет их.")
    ]
  });

  L({
    slug: "v-for", title: "Списки", summary: "v-for по массиву и объекту, обязательный key, почему не индекс, v-for с v-if.",
    skill: ["vue-for", "Списки", "Выводить списки через v-for с правильными ключами."],
    now: "Показываем по условию и выводим списки данных.",
    body: [
      vue("v-for", "Повторить для каждого", "`v-for=\"course in courses\"` создаёт элемент для каждого элемента массива; `(course, i) in courses` — с индексом.", "Каталог, уроки, комментарии.", "<li v-for=\"lesson in lessons\" :key=\"lesson.id\">\n  {{ lesson.title }}\n</li>"),
      idea("key", "Паспорт элемента", "Уникальный и стабильный key (обычно id) помогает Vue понять, какой элемент добавлен, удалён или перемещён.", "Без него при сортировке состояние полей «переезжает» к чужим строкам."),
      idea("Индекс как key", "Ловушка", "Индекс меняется при вставке и удалении — ключ перестаёт быть паспортом.", "Используй id из данных."),
      idea("v-for с v-if", "Не на одном элементе", "Не ставь v-if на тот же элемент, что v-for. Отфильтруй список в computed.", "Код понятнее и быстрее."),
      vue("Числа", "v-for=\"n in 5\"", "Повторить разметку N раз: звёзды рейтинга, заглушки загрузки.", "Не нужен массив ради повторения."),
      tip("v-for всегда с :key из id. Фильтр — в computed, а не v-if рядом с v-for.")
    ],
    quizzes: [
      single("vf-key", "key", "Что лучше всего использовать как key в v-for?",
        [["id", "Уникальный id элемента из данных"], ["index", "Индекс в массиве"], ["random", "Math.random()"], ["none", "Ничего"]], "id",
        "Ключ должен быть стабильным."),
      single("vf-if", "Фильтр", "Как показать только пройденные уроки в v-for?",
        [["computed", "Отфильтровать список в computed и перебрать его"], ["sameif", "v-if на том же элементе, что v-for"], ["css", "Скрыть через CSS"], ["slice", "Обрезать массив вручную в шаблоне"]], "computed",
        "Не смешивай v-for и v-if."),
      single("vf-n", "Повтор", "Что выведет `<span v-for=\"n in 3\">{{ n }}</span>`?",
        [["123", "1 2 3"], ["012", "0 1 2"], ["3", "3"], ["error", "Ошибку"]], "123",
        "Счёт с единицы.")
    ]
  });

  L({
    slug: "transitions", title: "Анимации появления", summary: "Transition и классы enter и leave, TransitionGroup для списков, уважение prefers-reduced-motion.",
    skill: ["vue-transition", "Анимации", "Анимировать появление и исчезновение элементов."],
    now: "Выводим списки и плавно анимируем их изменения.",
    body: [
      vue("Transition", "Плавно появиться", "Обёртка Transition добавляет классы v-enter-from, v-enter-active, v-leave-to — анимацию описывают в CSS.", "Окно и подсказка появляются мягко, а не прыжком.", "<Transition name=\"fade\">\n  <p v-if=\"saved\">Сохранено</p>\n</Transition>\n\n<style>\n.fade-enter-active, .fade-leave-active { transition: opacity .2s; }\n.fade-enter-from, .fade-leave-to { opacity: 0; }\n</style>"),
      vue("TransitionGroup", "Анимация списка", "Анимирует добавление, удаление и перемещение элементов v-for (нужны key).", "Новая задача въезжает в список."),
      idea("Меньше движения", "prefers-reduced-motion", "Некоторых людей анимации укачивают. Отключай их в медиазапросе prefers-reduced-motion: reduce.", "Доступность для всех."),
      tip("Появление — Transition, списки — TransitionGroup. Уважай prefers-reduced-motion.")
    ],
    quizzes: [
      single("tr-css", "Где анимация", "Где описывается сама анимация в Transition?",
        [["css", "В CSS через классы enter и leave"], ["js", "Только в JavaScript"], ["template", "В шаблоне атрибутами"], ["router", "В роутере"]], "css",
        "Vue только ставит классы."),
      single("tr-group", "Список", "Что использовать для анимации добавления в список v-for?",
        [["group", "TransitionGroup"], ["transition", "Transition вокруг каждого элемента без ключей"], ["keep", "KeepAlive"], ["teleport", "Teleport"]], "group",
        "С обязательными key."),
      single("tr-reduce", "Доступность", "Зачем учитывать prefers-reduced-motion?",
        [["motion", "Некоторым людям анимации вредят — их нужно отключать по настройке системы"], ["speed", "Для скорости"], ["seo", "Для поисковиков"], ["none", "Незачем"]], "motion",
        "Медиазапрос в CSS.")
    ]
  });
}
