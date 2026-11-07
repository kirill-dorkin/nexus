// Chapter 2: routing — file-based routes, layouts and navigation, dynamic segments.
import { idea, nx, tip, makeLesson } from "./nxkit.mjs";

export default function routing(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "file-routes", title: "Маршруты из папок", summary: "Папка — сегмент адреса, вложенность, группы маршрутов (скобки), приватные папки.",
    skill: ["nx-routes", "Маршруты", "Создавать страницы и вложенные маршруты папками."],
    now: "Знаем структуру проекта и строим адреса сайта папками.",
    body: [
      idea("Папка — сегмент", "Адрес из пути", "app/courses/page.tsx — адрес /courses, app/courses/python/page.tsx — /courses/python.", "Карта сайта видна в дереве файлов."),
      idea("Группы маршрутов", "(marketing)", "Папка в круглых скобках не попадает в адрес: app/(marketing)/about/page.tsx — /about. Группы дают разным разделам свои макеты.", "Лендинг и личный кабинет живут в одном приложении с разным оформлением."),
      idea("Приватные папки", "_components", "Папка с подчёркиванием не становится маршрутом — для компонентов и утилит рядом со страницами.", "Код лежит рядом с тем, где используется."),
      nx("Link", "Переход без перезагрузки", "Компонент Link из next/link меняет страницу без полной перезагрузки и заранее подгружает видимые ссылки.", "Переходы мгновенные, как в приложении.", "import Link from \"next/link\";\n\n<Link href=\"/courses\">Все курсы</Link>"),
      nx("useRouter", "Переход из кода", "`const router = useRouter(); router.push(\"/done\")` — переход после действия. Хук из next/navigation, только в клиентских компонентах.", "Перенаправить после отправки формы."),
      tip("Папка — сегмент адреса, (группа) — без адреса, _папка — не маршрут. Ссылки — через Link.")
    ],
    quizzes: [
      single("fr-addr", "Адрес", "Какой адрес у файла app/blog/news/page.tsx?",
        [["path", "/blog/news"], ["page", "/blog/news/page"], ["app", "/app/blog/news"], ["news", "/news"]], "path",
        "page.tsx — сама страница."),
      single("fr-group", "Группа", "Какой адрес у app/(shop)/cart/page.tsx?",
        [["cart", "/cart"], ["shop", "/shop/cart"], ["paren", "/(shop)/cart"], ["none", "Страницы не будет"]], "cart",
        "Скобки не попадают в адрес."),
      single("fr-link", "Ссылка", "Чем Link лучше обычного тега a для внутренних ссылок?",
        [["spa", "Переход без перезагрузки страницы и с предзагрузкой"], ["color", "Другой цвет"], ["seo", "Только Link видят поисковики"], ["none", "Ничем"]], "spa",
        "Link всё равно рисует тег a.")
    ]
  });

  L({
    slug: "layouts", title: "Макеты и шаблоны", summary: "Вложенные layout, сохранение состояния при переходах, общая навигация, template.",
    skill: ["nx-layouts", "Макеты", "Строить общие части страниц вложенными макетами."],
    now: "Создаём маршруты и выносим общие части страниц в макеты.",
    body: [
      nx("Вложенный layout", "Обёртка раздела", "layout.tsx в папке оборачивает все страницы этого раздела и вкладывается в родительский макет.", "Боковое меню кабинета пишется один раз для всех его страниц.", "// app/dashboard/layout.tsx\nexport default function DashboardLayout({ children }) {\n  return (\n    <div className=\"grid\">\n      <Sidebar />\n      <main>{children}</main>\n    </div>\n  );\n}"),
      idea("Сохранение состояния", "Макет не перерисовывается", "При переходе между страницами раздела макет остаётся на месте: состояние, прокрутка меню и открытые панели сохраняются.", "Плеер или чат в макете не прерывается при навигации."),
      idea("template.tsx", "Каждый раз заново", "Как layout, но создаётся заново при каждом переходе.", "Анимация входа страницы или сброс формы."),
      nx("usePathname", "Активная ссылка", "Хук возвращает текущий путь — подсветить активный пункт меню.", "Пользователь видит, где он находится.", "\"use client\";\nimport { usePathname } from \"next/navigation\";\n\nconst active = usePathname() === href;"),
      tip("Общее для раздела — в его layout. Макет живёт между переходами.")
    ],
    quizzes: [
      single("ly-scope", "Область", "Какие страницы оборачивает app/dashboard/layout.tsx?",
        [["section", "Все страницы внутри app/dashboard"], ["all", "Все страницы сайта"], ["one", "Только app/dashboard/page.tsx"], ["none", "Никакие"]], "section",
        "И вкладывается в корневой макет."),
      single("ly-state", "Состояние", "Что происходит с макетом при переходе между страницами раздела?",
        [["kept", "Он остаётся, состояние сохраняется"], ["reset", "Создаётся заново"], ["hidden", "Скрывается"], ["reload", "Перезагружается вся страница"]], "kept",
        "template — создаётся заново."),
      single("ly-path", "Текущий путь", "Каким хуком узнать текущий путь для подсветки меню?",
        [["pathname", "usePathname"], ["router", "useLocation"], ["path", "usePath"], ["url", "useUrl"]], "pathname",
        "Из next/navigation.")
    ]
  });

  L({
    slug: "dynamic-routes", title: "Динамические маршруты", summary: "[slug], params как Promise, catch-all [...slug], searchParams, generateStaticParams.",
    skill: ["nx-dynamic", "Динамические маршруты", "Создавать страницы с параметрами в адресе."],
    now: "Строим макеты и делаем страницы для тысяч записей одним файлом.",
    body: [
      nx("[slug]", "Параметр в адресе", "Папка в квадратных скобках — переменная часть адреса. Значение приходит в props.params, это Promise — его ждут через await.", "Одна страница показывает любой курс по его адресу.", "// app/courses/[slug]/page.tsx\nexport default async function Course({ params }) {\n  const { slug } = await params;\n  const course = await getCourse(slug);\n  return <h1>{course.title}</h1>;\n}"),
      idea("[...slug]", "Любая глубина", "Catch-all-сегмент ловит /docs/a, /docs/a/b/c и отдаёт массив частей. [[...slug]] — ещё и сам /docs.", "Документация и вложенные категории."),
      nx("searchParams", "Параметры запроса", "`?page=2&sort=new` приходит в searchParams страницы (тоже Promise).", "Фильтры и пагинация в адресе — ссылкой можно поделиться.", "export default async function List({ searchParams }) {\n  const { page = \"1\" } = await searchParams;\n}"),
      nx("generateStaticParams", "Заранее известные адреса", "Функция возвращает список параметров — эти страницы собираются заранее, при сборке.", "Тысячи статей отдаются как готовые файлы."),
      idea("notFound()", "Нет такой записи", "Вызов notFound() из next/navigation показывает страницу 404.", "Неверный адрес — честный ответ 404, а не пустая страница."),
      tip("[параметр] — переменная часть адреса. params и searchParams ждут через await.")
    ],
    quizzes: [
      single("dy-folder", "Папка", "Как назвать папку, чтобы адрес /courses/любой-курс обрабатывался одной страницей?",
        [["brackets", "app/courses/[slug]"], ["colon", "app/courses/:slug"], ["star", "app/courses/*"], ["braces", "app/courses/{slug}"]], "brackets",
        "Квадратные скобки — параметр."),
      single("dy-await", "params", "Как получить slug в серверной странице?",
        [["await", "`const { slug } = await params`"], ["sync", "`params.slug` без ожидания всегда"], ["hook", "`useParams()` в серверном компоненте"], ["query", "`router.query.slug`"]], "await",
        "params — Promise."),
      single("dy-404", "Нет записи", "Как показать 404, если курс не найден?",
        [["notfound", "Вызвать notFound()"], ["null", "Вернуть null"], ["throw", "Бросить любую ошибку"], ["redirect", "Перенаправить на главную"]], "notfound",
        "Ответ будет с кодом 404.")
    ]
  });
}
