// Chapter 7: Composition API — lifecycle hooks, composables, provide/inject and template refs.
import { vue, idea, tip, makeLesson } from "./vkit.mjs";

export default function composition(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "lifecycle", title: "Жизненный цикл", summary: "onMounted, onUnmounted, onUpdated, ref на элемент, очистка таймеров и подписок.",
    skill: ["vue-lifecycle", "Жизненный цикл", "Выполнять код при появлении и удалении компонента."],
    now: "Анимируем интерфейс и учимся выполнять код в нужный момент жизни компонента.",
    body: [
      vue("onMounted", "Компонент на странице", "Вызывается, когда компонент вставлен в DOM: можно обращаться к элементам, подключать сторонние библиотеки.", "Фокус на поле, график, карта.", "const input = ref(null);\nonMounted(() => input.value.focus());\n\n// <input ref=\"input\" />"),
      vue("onUnmounted", "Убрать за собой", "Вызывается при удалении компонента: снять таймеры, отписаться от событий, закрыть соединения.", "Иначе утечки памяти и обработчики-призраки.", "const timer = setInterval(tick, 1000);\nonUnmounted(() => clearInterval(timer));"),
      idea("ref на элемент", "Доступ к DOM", "Атрибут ref=\"имя\" и переменная с тем же именем дают доступ к настоящему элементу после монтирования.", "Нужен редко: фокус, размеры, сторонние библиотеки."),
      idea("Порядок", "setup → mounted → updated → unmounted", "Код в script setup выполняется до появления DOM; onMounted — после.", "Обращаться к элементам можно только с onMounted."),
      tip("Подключить — onMounted, убрать — onUnmounted. Каждому setInterval — свой clearInterval.")
    ],
    quizzes: [
      single("lc-dom", "DOM", "Когда можно обращаться к DOM-элементам компонента?",
        [["mounted", "В onMounted и позже"], ["setup", "Сразу в script setup"], ["never", "Никогда"], ["created", "Только до создания"]], "mounted",
        "До этого их ещё нет."),
      single("lc-clean", "Очистка", "Где останавливать setInterval компонента?",
        [["unmounted", "В onUnmounted"], ["mounted", "В onMounted"], ["template", "В шаблоне"], ["never", "Его не нужно останавливать"]], "unmounted",
        "Иначе таймер живёт после компонента."),
      single("lc-ref", "ref на элемент", "Как получить доступ к input для фокуса?",
        [["ref", "Атрибут ref=\"input\" и const input = ref(null)"], ["id", "Только document.getElementById"], ["query", "querySelector в setup"], ["none", "Нельзя"]], "ref",
        "Доступен после монтирования.")
    ]
  });

  L({
    slug: "composables", title: "Composables", summary: "Свои функции use…, повторное использование логики, VueUse.",
    skill: ["vue-composables", "Composables", "Выносить повторяющуюся логику в composables."],
    now: "Управляем жизненным циклом и выносим общую логику в функции.",
    body: [
      vue("Composable", "Функция с реактивностью", "Функция useX создаёт ref, computed, watch и хуки жизненного цикла и возвращает их. Её можно вызвать в любом компоненте.", "Логика «загрузить данные» или «следить за размером окна» пишется один раз.", "export function useOnline() {\n  const online = ref(navigator.onLine);\n  const update = () => (online.value = navigator.onLine);\n  onMounted(() => window.addEventListener(\"online\", update));\n  onUnmounted(() => window.removeEventListener(\"online\", update));\n  return { online };\n}"),
      idea("Соглашения", "use в начале", "Имя начинается с use, функция вызывается в setup, возвращает объект с ref.", "Сразу видно, что функция работает с реактивностью."),
      idea("VueUse", "Готовая коллекция", "Сотни готовых composables: useLocalStorage, useDark, useFetch, useMediaQuery.", "Не изобретать типовые вещи заново."),
      idea("Вместо миксинов", "Явные источники", "В отличие от старых миксинов, видно, откуда пришло каждое значение.", "Нет конфликтов имён и скрытых зависимостей."),
      tip("Повторяющаяся логика — composable useX. Сначала загляни в VueUse.")
    ],
    quizzes: [
      single("cm-what", "Composable", "Что такое composable?",
        [["fn", "Функция, которая использует Composition API и возвращает реактивные значения"], ["component", "Особый компонент"], ["plugin", "Плагин сборщика"], ["css", "CSS-модуль"]], "fn",
        "Начинается с use."),
      single("cm-where", "Где вызывать", "Где вызывают composable?",
        [["setup", "В script setup компонента или другом composable"], ["template", "В шаблоне"], ["css", "В стилях"], ["main", "Только в main.js"]], "setup",
        "Там работают хуки."),
      single("cm-vueuse", "VueUse", "Что такое VueUse?",
        [["lib", "Коллекция готовых composables"], ["router", "Роутер"], ["store", "Хранилище"], ["cli", "Командная строка Vue"]], "lib",
        "useLocalStorage, useDark…")
    ]
  });

  L({
    slug: "provide-inject", title: "provide и inject", summary: "Передача данных через много уровней, ключи-символы, реактивность, когда лучше хранилище.",
    skill: ["vue-provide", "provide и inject", "Передавать данные глубоко по дереву без цепочки props."],
    now: "Выносим логику в composables и передаём данные сквозь много уровней.",
    body: [
      vue("provide", "Предоставить вниз", "Предок вызывает provide(ключ, значение) — все потомки могут его получить.", "Тема, язык, текущий пользователь без передачи через десять компонентов.", "// Предок\nprovide(\"theme\", theme);\n\n// Потомок на любой глубине\nconst theme = inject(\"theme\");"),
      idea("Проброс props", "Prop drilling", "Передавать значение через компоненты, которым оно не нужно, — утомительно и хрупко.", "provide/inject убирает лишние звенья."),
      idea("Реактивный provide", "Передавай ref", "Если передать ref, потомки увидят изменения. Изменять лучше через функцию, тоже переданную provide.", "Владелец данных остаётся один."),
      idea("Когда хранилище", "Pinia", "Если данные нужны в разных ветках приложения и меняются из многих мест — используй Pinia.", "provide/inject — для поддерева, Pinia — для приложения."),
      tip("Данные для поддерева — provide/inject. Глобальное состояние — Pinia.")
    ],
    quizzes: [
      single("pi-why", "Зачем", "Какую проблему решает provide/inject?",
        [["drill", "Передачу данных через много уровней без цепочки props"], ["speed", "Скорость отрисовки"], ["css", "Стили"], ["route", "Маршрутизацию"]], "drill",
        "Prop drilling."),
      single("pi-reactive", "Реактивность", "Как сделать, чтобы потомки видели изменения переданного значения?",
        [["ref", "Передать ref или reactive"], ["string", "Передать строку"], ["copy", "Передать копию"], ["none", "Невозможно"]], "ref",
        "Обычное значение не обновится."),
      single("pi-store", "Или хранилище", "Когда лучше взять Pinia вместо provide/inject?",
        [["global", "Когда данные нужны во всём приложении и меняются из многих мест"], ["never", "Никогда"], ["small", "Для одного компонента"], ["css", "Для стилей"]], "global",
        "provide — для поддерева.")
    ]
  });
}
