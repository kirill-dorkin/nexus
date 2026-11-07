// Chapter 8: Vue Router — routes and RouterView, dynamic params, guards and lazy loading.
import { vue, idea, tip, makeLesson } from "./vkit.mjs";

export default function router(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "routes", title: "Маршруты", summary: "createRouter, таблица маршрутов, RouterView и RouterLink, история браузера.",
    skill: ["vue-routes", "Маршруты", "Настраивать страницы приложения через Vue Router."],
    now: "Передаём данные по дереву и делаем из приложения несколько страниц.",
    body: [
      vue("createRouter", "Таблица маршрутов", "Каждый маршрут — путь и компонент страницы. createWebHistory даёт обычные адреса без #.", "Приложение на одной странице с настоящими адресами.", "const router = createRouter({\n  history: createWebHistory(),\n  routes: [\n    { path: \"/\", component: Home },\n    { path: \"/courses\", component: Courses }\n  ]\n});\ncreateApp(App).use(router).mount(\"#app\");"),
      vue("RouterView", "Место для страницы", "В App.vue `<RouterView />` показывает компонент текущего маршрута.", "Шапка и подвал общие, меняется середина."),
      vue("RouterLink", "Ссылка без перезагрузки", "`<RouterLink to=\"/courses\">Курсы</RouterLink>` меняет адрес и страницу без загрузки с сервера.", "Мгновенные переходы и активный класс у текущей ссылки."),
      idea("Сервер и история", "Отдавать index.html", "При прямом заходе на /courses сервер должен вернуть index.html, иначе — 404.", "Настройка хостинга для одностраничных приложений."),
      tip("Маршруты — в createRouter, страница — в RouterView, ссылки — RouterLink.")
    ],
    quizzes: [
      single("rt-view", "Где страница", "Где показывается компонент текущего маршрута?",
        [["view", "В RouterView"], ["link", "В RouterLink"], ["app", "Всегда вместо всего App"], ["head", "В head"]], "view",
        "Остальная разметка App остаётся."),
      single("rt-link", "Ссылка", "Чем RouterLink лучше обычного a href?",
        [["spa", "Переход без перезагрузки страницы"], ["color", "Другой цвет"], ["seo", "Поисковики видят только RouterLink"], ["none", "Ничем"]], "spa",
        "И класс активной ссылки."),
      single("rt-404", "Прямой заход", "Почему при прямом заходе на /courses хостинг может вернуть 404?",
        [["server", "Сервер ищет файл courses, а должен вернуть index.html"], ["router", "Ошибка роутера"], ["dns", "DNS"], ["css", "Стили"]], "server",
        "Нужна настройка перенаправления на index.html.")
    ]
  });

  L({
    slug: "route-params", title: "Параметры и вложенность", summary: "Динамические сегменты :id, useRoute и useRouter, query, вложенные маршруты, 404.",
    skill: ["vue-params", "Параметры маршрутов", "Использовать параметры адреса и вложенные маршруты."],
    now: "Настроили страницы и делаем адреса с параметрами.",
    body: [
      vue(":slug", "Параметр пути", "`{ path: \"/courses/:slug\", component: Course }` — одна страница на все курсы. Значение — в useRoute().params.slug.", "Адрес можно сохранить и отправить другу.", "const route = useRoute();\nconst course = computed(() => findCourse(route.params.slug));"),
      vue("useRouter", "Переход из кода", "`router.push(\"/done\")` — перейти после действия, `router.back()` — назад.", "После оформления заказа — на страницу заказа."),
      idea("query", "Параметры запроса", "`/courses?level=2&sort=new` — фильтры в route.query.", "Фильтры сохраняются в адресе и переживают обновление страницы."),
      idea("Вложенные маршруты", "children", "Маршрут с children и вложенный RouterView — раздел с общими вкладками.", "Профиль: обзор, настройки, история — с общей шапкой."),
      vue("404", "Всё остальное", "Маршрут `{ path: \"/:pathMatch(.*)*\", component: NotFound }` ловит неизвестные адреса.", "Понятная страница вместо пустоты."),
      tip("Параметр — :имя, фильтры — query, разделы — children, неизвестное — pathMatch.")
    ],
    quizzes: [
      single("rp-param", "Параметр", "Как получить slug из адреса /courses/python?",
        [["params", "`useRoute().params.slug`"], ["query", "`useRoute().query.slug`"], ["window", "`window.slug`"], ["props", "Только через props"]], "params",
        "query — для ?ключ=значение."),
      single("rp-push", "Перейти", "Как перейти на /done из кода?",
        [["push", "`useRouter().push(\"/done\")`"], ["href", "`location.href` обязательно"], ["route", "`useRoute().go`"], ["link", "`RouterLink(\"/done\")`"]], "push",
        "router.back() — назад."),
      single("rp-filters", "Фильтры", "Почему фильтры удобно хранить в query?",
        [["url", "Они сохраняются в адресе: можно обновить страницу и поделиться ссылкой"], ["speed", "Так быстрее"], ["secure", "Так безопаснее"], ["none", "Не удобно"]], "url",
        "Состояние в адресе.")
    ]
  });

  L({
    slug: "guards", title: "Защита и ленивая загрузка", summary: "beforeEach и проверка входа, meta маршрутов, ленивые компоненты страниц, прокрутка.",
    skill: ["vue-guards", "Защита маршрутов", "Защищать страницы и загружать их по требованию."],
    now: "Работаем с параметрами и закрываем страницы от неавторизованных.",
    body: [
      vue("beforeEach", "Проверка перед переходом", "Глобальный охранник получает целевой маршрут и может вернуть другой адрес.", "Неавторизованного — на страницу входа.", "router.beforeEach((to) => {\n  if (to.meta.requiresAuth && !auth.user) {\n    return { path: \"/login\", query: { next: to.fullPath } };\n  }\n});"),
      idea("meta", "Метки маршрута", "`meta: { requiresAuth: true, title: \"Кабинет\" }` — свои данные маршрута для охранников и заголовков.", "Правила доступа рядом с маршрутом."),
      vue("Ленивая загрузка", "Страница по требованию", "`component: () => import(\"./pages/Admin.vue\")` — код страницы скачается при первом переходе.", "Первая загрузка приложения легче.", "{ path: \"/admin\", component: () => import(\"./pages/Admin.vue\") }"),
      idea("Защита только в браузере", "Это удобство", "Охранник маршрута не защищает данные: API обязан проверить права сам.", "Код страницы можно открыть и без маршрута."),
      tip("Доступ к страницам — beforeEach и meta. Тяжёлые страницы — import(). Данные защищает сервер.")
    ],
    quizzes: [
      single("gd-redirect", "Вход", "Как отправить неавторизованного пользователя на /login?",
        [["guard", "Вернуть адрес /login из router.beforeEach"], ["css", "Скрыть страницу CSS"], ["alert", "Показать alert"], ["reload", "Перезагрузить страницу"]], "guard",
        "Охранник маршрута."),
      single("gd-lazy", "Ленивая загрузка", "Что даёт `component: () => import(\"./Admin.vue\")`?",
        [["lazy", "Код страницы загрузится только при первом переходе"], ["fast", "Страница всегда грузится первой"], ["ssr", "Серверную отрисовку"], ["error", "Ошибку"]], "lazy",
        "Лёгкий старт приложения."),
      single("gd-api", "Безопасность", "Защищают ли охранники маршрутов данные на сервере?",
        [["no", "Нет, права обязан проверять API"], ["yes", "Да, полностью"], ["https", "Да, на HTTPS"], ["meta", "Да, если есть meta"]], "no",
        "Это удобство интерфейса.")
    ]
  });
}
