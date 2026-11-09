// Chapter 8: observers — IntersectionObserver, ResizeObserver, MutationObserver, PerformanceObserver.
import { idea, wa, tip, makeLesson } from "./wkit.mjs";

export default function observers(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "intersection", title: "IntersectionObserver", summary: "Виден ли элемент: ленивая загрузка, бесконечная лента, анимация при появлении, порог и отступы.",
    skill: ["wa-intersection", "IntersectionObserver", "Узнавать, когда элемент появляется на экране."],
    now: "Пользуемся устройствами и узнаём, что пользователь видит на экране.",
    body: [
      wa("Наблюдатель видимости", "Без событий прокрутки", "Браузер сам сообщает, когда элемент входит в видимую область или уходит из неё.", "Нет тяжёлых обработчиков scroll.", "const io = new IntersectionObserver((entries) => {\n  for (const e of entries) if (e.isIntersecting) loadMore();\n}, { rootMargin: \"300px\" });\nio.observe(document.querySelector(\"#sentinel\"));"),
      idea("Бесконечная лента", "Маячок внизу", "Невидимый элемент в конце списка: появился — загружаем следующую порцию.", "Лента грузится заранее, без рывков."),
      idea("rootMargin и threshold", "Когда срабатывать", "rootMargin расширяет область заранее, threshold задаёт, какая доля элемента должна быть видна.", "Загружать картинки за 300px до появления."),
      idea("loading=\"lazy\"", "Иногда хватит HTML", "Для картинок и iframe ленивая загрузка встроена: атрибут loading=\"lazy\".", "Не пиши код, если хватает атрибута."),
      tip("Видимость — IntersectionObserver, а не scroll. Картинкам хватит loading=\"lazy\".")
    ],
    quizzes: [
      single("is-why", "Зачем", "Чем IntersectionObserver лучше обработчика scroll?",
        [["browser", "Браузер сам вычисляет видимость, не нагружая прокрутку"], ["old", "scroll запрещён"], ["style", "Только красивее код"], ["none", "Ничем"]], "browser",
        "Нет вычислений на каждый пиксель."),
      single("is-margin", "rootMargin", "Что даёт rootMargin: \"300px\"?",
        [["early", "Срабатывать заранее, за 300px до появления"], ["late", "Позже на 300px"], ["size", "Задаёт размер элемента"], ["none", "Ничего"]], "early",
        "Подгрузка до того, как увидят."),
      single("is-lazy", "Картинки", "Как проще всего лениво загружать картинки?",
        [["attr", "Атрибутом loading=\"lazy\""], ["js", "Только своим кодом"], ["css", "Через CSS"], ["none", "Никак"]], "attr",
        "Встроено в браузер.")
    ]
  });

  L({
    slug: "resize-mutation", title: "ResizeObserver и MutationObserver", summary: "Изменение размеров элемента, контейнерные запросы, слежение за изменениями DOM.",
    skill: ["wa-resize", "Наблюдатели размера и DOM", "Реагировать на изменение размеров и разметки."],
    now: "Следим за видимостью и реагируем на изменения размеров и разметки.",
    body: [
      wa("ResizeObserver", "Размер элемента", "Сообщает, когда меняется размер конкретного элемента — не только окна.", "График перерисовывается при сворачивании боковой панели.", "new ResizeObserver(([entry]) => {\n  chart.resize(entry.contentRect.width);\n}).observe(chartBox);"),
      idea("Контейнерные запросы", "Часто хватит CSS", "@container в CSS меняет вид элемента по ширине его контейнера без JavaScript.", "Карточка перестраивается в узкой колонке сама."),
      idea("MutationObserver", "Изменения DOM", "Сообщает о добавлении узлов, смене атрибутов и текста.", "Расширения, виджеты и интеграции, которые реагируют на чужую разметку."),
      idea("Не злоупотребляй", "Своё — меняй сам", "Если разметку меняет твой код, проще вызвать реакцию напрямую, чем следить за DOM.", "Меньше скрытых связей."),
      tip("Размер элемента — ResizeObserver или @container. Чужие изменения DOM — MutationObserver.")
    ],
    quizzes: [
      single("rm-resize", "Размер", "Как узнать, что изменилась ширина конкретного блока, а не окна?",
        [["ro", "ResizeObserver"], ["resize", "Только window.onresize"], ["io", "IntersectionObserver"], ["none", "Никак"]], "ro",
        "Работает для любого элемента."),
      single("rm-container", "CSS", "Чем можно изменить вид карточки по ширине её контейнера без JavaScript?",
        [["container", "Контейнерными запросами @container"], ["media", "Только @media по окну"], ["js", "Только JavaScript"], ["none", "Никак"]], "container",
        "Современный CSS."),
      single("rm-mutation", "MutationObserver", "Что отслеживает MutationObserver?",
        [["dom", "Изменения DOM: узлы, атрибуты, текст"], ["size", "Размер окна"], ["net", "Сетевые запросы"], ["mouse", "Движение мыши"]], "dom",
        "Полезно для чужой разметки.")
    ]
  });

  L({
    slug: "performance-api", title: "Измерение скорости", summary: "performance.now, mark и measure, PerformanceObserver, Web Vitals реальных пользователей.",
    skill: ["wa-perf", "Performance API", "Измерять скорость страницы у реальных пользователей."],
    now: "Следим за размерами и DOM и измеряем скорость страницы.",
    body: [
      wa("mark и measure", "Свои замеры", "performance.mark ставит отметку, measure считает время между отметками.", "Сколько занимает отрисовка списка на самом деле.", "performance.mark(\"render-start\");\nrenderList(items);\nperformance.mark(\"render-end\");\nperformance.measure(\"render\", \"render-start\", \"render-end\");"),
      wa("PerformanceObserver", "Подписка на метрики", "Сообщает о долгих задачах, загрузке ресурсов, отрисовке крупнейшего элемента.", "Видно, что тормозит у реальных людей.", "new PerformanceObserver((list) => {\n  for (const e of list.getEntries()) report(\"lcp\", e.startTime);\n}).observe({ type: \"largest-contentful-paint\", buffered: true });"),
      idea("Web Vitals", "Три главные метрики", "LCP — главный контент, INP — отклик на действия, CLS — сдвиги макета. Их измеряют у посетителей и отправляют на сервер.", "Лабораторный тест не видит слабые телефоны."),
      idea("sendBeacon", "Отправить при уходе", "navigator.sendBeacon надёжно отправляет метрики при закрытии страницы.", "Данные не теряются."),
      tip("Свои замеры — mark и measure, реальные метрики — PerformanceObserver и sendBeacon.")
    ],
    quizzes: [
      single("pa-measure", "Замер", "Как измерить время между двумя точками кода?",
        [["mark", "performance.mark и performance.measure"], ["date", "Только new Date()"], ["alert", "alert"], ["none", "Никак"]], "mark",
        "Высокая точность."),
      single("pa-real", "Реальные данные", "Почему метрики собирают у реальных посетителей?",
        [["devices", "Лабораторный тест не видит слабые телефоны и медленные сети"], ["law", "По закону"], ["seo", "Только для поисковиков"], ["none", "Незачем"]], "devices",
        "Web Vitals в поле."),
      single("pa-beacon", "Отправка", "Чем отправить метрики при закрытии страницы?",
        [["beacon", "navigator.sendBeacon"], ["alert", "alert"], ["sync", "Синхронным XHR"], ["none", "Никак"]], "beacon",
        "Надёжно и без задержки закрытия.")
    ]
  });
}
