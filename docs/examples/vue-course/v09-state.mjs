// Chapter 9: application state with Pinia — stores, getters and actions, persistence and structure.
import { vue, idea, tip, makeLesson } from "./vkit.mjs";

export default function state(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "pinia", title: "Хранилище Pinia", summary: "defineStore, состояние, геттеры и действия, использование в компонентах, storeToRefs.",
    skill: ["vue-pinia", "Pinia", "Хранить общее состояние приложения в Pinia."],
    now: "Защитили маршруты и храним общее состояние приложения.",
    body: [
      vue("defineStore", "Хранилище", "Хранилище в стиле setup: ref — состояние, computed — геттеры, функции — действия.", "Корзина доступна в шапке, каталоге и оформлении заказа.", "export const useCart = defineStore(\"cart\", () => {\n  const items = ref([]);\n  const total = computed(() => items.value.reduce((s, i) => s + i.price, 0));\n  function add(course) {\n    items.value.push(course);\n  }\n  return { items, total, add };\n});"),
      vue("В компоненте", "Вызвать хранилище", "`const cart = useCart()` — и в шаблоне `{{ cart.total }}`, `@click=\"cart.add(course)\"`.", "Все компоненты видят одни и те же данные.", "const cart = useCart();\nconst { items, total } = storeToRefs(cart);"),
      idea("storeToRefs", "Деструктуризация без потерь", "Обычная деструктуризация хранилища теряет реактивность; storeToRefs сохраняет её для состояния и геттеров.", "Действия берут напрямую из cart."),
      idea("Инструменты", "Vue DevTools", "Pinia видна в DevTools: состояние, история изменений, путешествие во времени.", "Видно, кто и когда изменил данные."),
      tip("Общее состояние — Pinia. Деструктуризация — через storeToRefs.")
    ],
    quizzes: [
      single("pn-why", "Зачем", "Когда нужно хранилище Pinia?",
        [["shared", "Когда данные нужны многим компонентам в разных частях приложения"], ["local", "Для состояния одной кнопки"], ["css", "Для стилей"], ["route", "Для маршрутов"]], "shared",
        "Корзина, пользователь, настройки."),
      single("pn-refs", "storeToRefs", "Зачем storeToRefs?",
        [["reactive", "Деструктурировать состояние хранилища без потери реактивности"], ["save", "Сохранить хранилище на диск"], ["reset", "Сбросить хранилище"], ["copy", "Скопировать в другой store"]], "reactive",
        "Действия берут напрямую."),
      single("pn-getter", "Геттер", "Чем в хранилище стиля setup является геттер?",
        [["computed", "computed"], ["ref", "ref"], ["watch", "watch"], ["method", "Обычным полем"]], "computed",
        "Состояние — ref, действия — функции.")
    ]
  });

  L({
    slug: "store-patterns", title: "Устройство хранилищ", summary: "Несколько маленьких хранилищ, асинхронные действия, сохранение в localStorage, сброс.",
    skill: ["vue-storepatterns", "Устройство хранилищ", "Организовывать хранилища и асинхронные действия."],
    now: "Создали хранилище и учимся раскладывать состояние правильно.",
    body: [
      idea("По предметным областям", "Много маленьких", "useAuth, useCart, useProgress — каждое отвечает за своё. Хранилища могут использовать друг друга.", "Код проще читать и тестировать."),
      vue("Асинхронное действие", "Загрузка с флагами", "Действие ставит loading, делает запрос, сохраняет результат или ошибку.", "Компоненты только вызывают load() и показывают состояние.", "async function load() {\n  loading.value = true;\n  error.value = null;\n  try {\n    courses.value = await api.courses();\n  } catch (e) {\n    error.value = \"Не удалось загрузить курсы\";\n  } finally {\n    loading.value = false;\n  }\n}"),
      vue("Сохранение", "Пережить перезагрузку", "watch за состоянием пишет его в localStorage, при создании хранилища читаем обратно. Или плагин pinia-plugin-persistedstate.", "Корзина не пропадает после обновления страницы."),
      idea("Что не хранить", "Не всё — в хранилище", "Состояние одного компонента (открыто ли меню) держи в нём. Данные с сервера часто удобнее кэшировать отдельной библиотекой.", "Хранилище не превращается в свалку."),
      tip("Хранилище на область. Запросы — в действиях с loading и error.")
    ],
    quizzes: [
      single("sp-split", "Разделение", "Как лучше организовать состояние большого приложения?",
        [["areas", "Несколько хранилищ по предметным областям"], ["one", "Одно огромное хранилище на всё"], ["global", "Глобальные переменные window"], ["props", "Только props"]], "areas",
        "useAuth, useCart…"),
      single("sp-async", "Запрос", "Где удобно делать загрузку данных для хранилища?",
        [["action", "В асинхронном действии хранилища"], ["getter", "В геттере"], ["template", "В шаблоне"], ["css", "В стилях"]], "action",
        "С флагами loading и error."),
      single("sp-local", "Локальное", "Где хранить состояние «открыто ли выпадающее меню»?",
        [["component", "В самом компоненте меню"], ["pinia", "Обязательно в Pinia"], ["server", "На сервере"], ["cookie", "В cookie"]], "component",
        "Не всё нужно делать глобальным.")
    ]
  });

  L({
    slug: "typescript-vue", title: "Vue и TypeScript", summary: "lang=\"ts\", типы props и emits, типизированные ref, vue-tsc в проверках.",
    skill: ["vue-ts", "Vue и TypeScript", "Писать компоненты Vue на TypeScript."],
    now: "Организовали хранилища и добавляем типы во всё приложение.",
    body: [
      vue("lang=\"ts\"", "Типы в компоненте", "`<script setup lang=\"ts\">` — TypeScript в компоненте. Props и события описывают типами.", "Ошибки передачи данных видны в редакторе.", "<script setup lang=\"ts\">\nconst props = defineProps<{ title: string; lessons?: number }>();\nconst emit = defineEmits<{ add: [id: string] }>();\n</script>"),
      vue("Типизированный ref", "ref<Тип>()", "`const user = ref<User | null>(null)` — понятно, что может лежать в переменной.", "Редактор подскажет поля user и предупредит о null."),
      idea("vue-tsc", "Проверка шаблонов", "Обычный tsc не понимает .vue. vue-tsc проверяет и script, и шаблоны — его запускают в CI.", "Опечатка в имени поля в шаблоне ловится до выпуска."),
      idea("Постепенно", "Не обязательно сразу", "Можно начать с JavaScript и добавлять TypeScript по компонентам.", "Порог входа низкий."),
      tip("lang=\"ts\", props и emits — типами, проверка — vue-tsc в CI.")
    ],
    quizzes: [
      single("tv-props", "Типы props", "Как описать props с типами в script setup lang=\"ts\"?",
        [["generic", "`defineProps<{ title: string }>()`"], ["proptypes", "`PropTypes.string`"], ["interface", "Только interface Props без defineProps"], ["any", "Типы props не поддерживаются"]], "generic",
        "Типовой параметр."),
      single("tv-tsc", "Проверка", "Чем проверить типы в шаблонах .vue?",
        [["vuetsc", "vue-tsc"], ["tsc", "Только обычным tsc"], ["eslint", "Только ESLint"], ["none", "Никак"]], "vuetsc",
        "Запускают в CI."),
      single("tv-ref", "ref с типом", "Как объявить ref, в котором будет User или null?",
        [["typed", "`ref<User | null>(null)`"], ["any", "`ref(any)`"], ["cast", "`ref(null as string)`"], ["no", "Нельзя"]], "typed",
        "Редактор подскажет поля.")
    ]
  });
}
