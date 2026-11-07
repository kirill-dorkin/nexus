// Chapter 8: styles, media and metadata — CSS options, next/image and next/font, SEO metadata.
import { idea, nx, tip, makeLesson } from "./nxkit.mjs";

export default function ui(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "styling", title: "Стили", summary: "Глобальный CSS, CSS-модули, Tailwind CSS, тёмная тема без мигания.",
    skill: ["nx-styles", "Стили", "Подключать и организовывать стили в приложении Next.js."],
    now: "Работаем с cookies и окружением и оформляем интерфейс.",
    body: [
      idea("Глобальный CSS", "Только в макете", "globals.css импортируют в корневой layout: сброс стилей, переменные, базовая типографика.", "Общие правила — в одном месте."),
      nx("CSS-модули", "Классы без конфликтов", "Файл Card.module.css даёт уникальные имена классов для компонента.", "Класс .title в двух компонентах не конфликтует.", "import styles from \"./Card.module.css\";\n\n<article className={styles.card}>…</article>"),
      nx("Tailwind CSS", "Утилитарные классы", "Стили пишут классами прямо в разметке. Настраивается при создании проекта.", "Быстро собирать интерфейс без переключения между файлами.", "<button className=\"rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700\">Записаться</button>"),
      idea("Тёмная тема", "Без мигания", "Тему из cookie читают на сервере и ставят класс на html сразу, или используют prefers-color-scheme.", "Страница не мигает светлой при загрузке."),
      tip("Глобальное — globals.css, компонентное — модули или Tailwind.")
    ],
    quizzes: [
      single("sy-global", "Глобальный CSS", "Где импортируют globals.css?",
        [["layout", "В корневом layout"], ["each", "В каждой странице"], ["public", "Кладут в public"], ["config", "В next.config"]], "layout",
        "Один раз для всего приложения."),
      single("sy-module", "Модули", "Зачем CSS-модули?",
        [["scope", "Имена классов уникальны для компонента — нет конфликтов"], ["speed", "Только для скорости"], ["js", "Чтобы писать CSS на JavaScript"], ["none", "Незачем"]], "scope",
        "Файл *.module.css."),
      single("sy-flash", "Мигание", "Как избежать мигания светлой темы при загрузке?",
        [["server", "Определить тему на сервере и сразу поставить класс на html"], ["effect", "Поставить тему в useEffect"], ["timeout", "Задержать показ на секунду"], ["none", "Никак"]], "server",
        "Или prefers-color-scheme в CSS.")
    ]
  });

  L({
    slug: "image-font", title: "Картинки и шрифты", summary: "next/image: размеры, lazy, форматы, priority; next/font: свои шрифты без скачков.",
    skill: ["nx-media", "Картинки и шрифты", "Оптимизировать картинки и шрифты встроенными компонентами."],
    now: "Оформляем интерфейс и ускоряем загрузку картинок и шрифтов.",
    body: [
      nx("next/image", "Оптимизированная картинка", "Компонент сжимает и отдаёт картинку в современном формате и нужном размере, грузит лениво. width и height обязательны (или fill).", "Страница быстрее, макет не прыгает при загрузке.", "import Image from \"next/image\";\n\n<Image src=\"/hero.jpg\" alt=\"Ученик за ноутбуком\" width={1200} height={630} priority />"),
      idea("priority", "Главная картинка", "Первую большую картинку экрана помечают priority — она грузится сразу, а не лениво.", "Улучшает время отрисовки главного содержимого (LCP)."),
      idea("Чужие картинки", "remotePatterns", "Картинки с других доменов разрешают в next.config в images.remotePatterns.", "Защита от использования оптимизатора как бесплатного прокси."),
      nx("next/font", "Шрифты без скачков", "Шрифт Google или свой файл скачивается при сборке и отдаётся с твоего домена, с правильным запасным шрифтом.", "Текст не прыгает, а к Google не уходят запросы посетителей.", "import { Inter } from \"next/font/google\";\nconst inter = Inter({ subsets: [\"latin\", \"cyrillic\"] });\n\n<body className={inter.className}>"),
      tip("Картинки — next/image с размерами, главная — priority. Шрифты — next/font с cyrillic.")
    ],
    quizzes: [
      single("if-size", "Размеры", "Что обязательно указать в next/image для обычной картинки?",
        [["wh", "width и height (или fill)"], ["format", "Формат файла"], ["cdn", "Адрес CDN"], ["nothing", "Ничего"]], "wh",
        "Иначе макет будет прыгать."),
      single("if-priority", "Первый экран", "Зачем priority на главной картинке?",
        [["lcp", "Чтобы она грузилась сразу и ускорила LCP"], ["hide", "Чтобы скрыть её"], ["cache", "Чтобы не кэшировать"], ["seo", "Чтобы её не видели поисковики"]], "lcp",
        "Остальные грузятся лениво."),
      single("if-font", "Шрифты", "Что делает next/font со шрифтом Google?",
        [["self", "Скачивает при сборке и раздаёт с твоего домена"], ["cdn", "Подключает с серверов Google при каждом показе"], ["svg", "Превращает в SVG"], ["none", "Ничего"]], "self",
        "Быстрее и приватнее.")
    ]
  });

  L({
    slug: "metadata", title: "Метаданные и поисковики", summary: "metadata и generateMetadata, Open Graph, sitemap и robots, канонический адрес.",
    skill: ["nx-seo", "Метаданные", "Настраивать заголовки, превью и файлы для поисковиков."],
    now: "Ускорили картинки и шрифты и готовим страницы для поисковиков и соцсетей.",
    body: [
      nx("metadata", "Заголовок и описание", "Объект metadata в page или layout задаёт title, description и превью для соцсетей.", "Красивая карточка при отправке ссылки и понятный сниппет в поиске.", "export const metadata = {\n  title: \"Курс Python\",\n  description: \"Python с нуля: 33 урока с тестами\",\n  openGraph: { images: [\"/og/python.png\"] }\n};"),
      nx("generateMetadata", "Метаданные из данных", "Асинхронная функция строит метаданные из параметров страницы: название курса в title.", "У каждой страницы — свой заголовок.", "export async function generateMetadata({ params }) {\n  const { slug } = await params;\n  const course = await getCourse(slug);\n  return { title: course.title };\n}"),
      idea("sitemap и robots", "Файлы для поисковиков", "app/sitemap.ts и app/robots.ts генерируют sitemap.xml и robots.txt из кода.", "Поисковик быстро находит все страницы."),
      idea("Шаблон заголовка", "title.template", "В корневом макете `title: { template: \"%s · Академия\", default: \"Академия\" }` добавляет название сайта ко всем страницам.", "Единый вид заголовков без повторов."),
      tip("У каждой страницы — свой title и description. sitemap и robots — из кода.")
    ],
    quizzes: [
      single("md-dynamic", "Из данных", "Как задать title страницы курса по его названию из базы?",
        [["gen", "Функцией generateMetadata"], ["head", "Тегом head в JSX вручную"], ["effect", "document.title в useEffect"], ["config", "В next.config"]], "gen",
        "Она получает params."),
      single("md-og", "Превью", "За что отвечает openGraph в metadata?",
        [["preview", "За превью ссылки в соцсетях и мессенджерах"], ["speed", "За скорость"], ["auth", "За вход"], ["css", "За стили"]], "preview",
        "Картинка, заголовок и описание."),
      single("md-sitemap", "Карта сайта", "Как сгенерировать sitemap.xml?",
        [["file", "Файлом app/sitemap.ts"], ["manual", "Только вручную в public"], ["plugin", "Только плагином"], ["none", "Нельзя"]], "file",
        "robots.txt — app/robots.ts.")
    ]
  });
}
