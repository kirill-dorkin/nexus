// Chapter 4: browser storage — Web Storage, IndexedDB, the Cache API and quotas.
import { idea, wa, tip, makeLesson } from "./wkit.mjs";

export default function storage(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "web-storage", title: "localStorage и sessionStorage", summary: "Пары строк, JSON внутри, событие storage, ограничения и что туда не класть.",
    skill: ["wa-localstorage", "Web Storage", "Хранить небольшие настройки в браузере."],
    now: "Понимаем CORS и сохраняем данные прямо в браузере.",
    body: [
      wa("localStorage", "Ключ → строка", "setItem и getItem хранят строки навсегда (пока не очистят). Объекты — через JSON.", "Тема, язык, черновик комментария.", "localStorage.setItem(\"theme\", \"dark\");\nconst draft = JSON.parse(localStorage.getItem(\"draft\") ?? \"null\");"),
      idea("sessionStorage", "До закрытия вкладки", "То же API, но данные живут только в этой вкладке до её закрытия.", "Шаг многошаговой формы."),
      idea("Ограничения", "Маленькое и синхронное", "Около 5 МБ на сайт, только строки, чтение блокирует поток. В приватном режиме может бросить ошибку.", "Оборачивай в try/catch."),
      idea("Не для секретов", "Видно любому скрипту", "Любой скрипт страницы (включая внедрённый) читает localStorage. Токены входа там уязвимы для XSS.", "Сессию — в httpOnly cookie."),
      tip("Мелкие настройки — localStorage в try/catch. Секреты — никогда.")
    ],
    quizzes: [
      single("ws-types", "Типы", "Что хранит localStorage?",
        [["strings", "Только строки — объекты превращают в JSON"], ["any", "Любые объекты"], ["files", "Файлы"], ["numbers", "Только числа"]], "strings",
        "JSON.stringify и JSON.parse."),
      single("ws-session", "sessionStorage", "Сколько живут данные sessionStorage?",
        [["tab", "До закрытия вкладки"], ["forever", "Навсегда"], ["hour", "Один час"], ["reload", "До перезагрузки"]], "tab",
        "Перезагрузку переживают."),
      single("ws-token", "Токены", "Почему не стоит хранить токен входа в localStorage?",
        [["xss", "Любой скрипт на странице, включая внедрённый, может его прочитать"], ["size", "Он не поместится"], ["slow", "Это медленно"], ["none", "Стоит"]], "xss",
        "Сессию — в httpOnly cookie.")
    ]
  });

  L({
    slug: "indexeddb", title: "IndexedDB", summary: "База в браузере: хранилища объектов, транзакции, индексы, обёртка idb, офлайн-данные.",
    skill: ["wa-indexeddb", "IndexedDB", "Хранить большие структурированные данные в браузере."],
    now: "Храним мелочи в localStorage и переходим к настоящей базе в браузере.",
    body: [
      idea("IndexedDB", "Асинхронная база", "Хранит объекты, файлы и большие объёмы, работает асинхронно и не блокирует страницу.", "Офлайн-заметки, кэш данных, очередь отправки."),
      wa("Обёртка idb", "Удобный Promise", "Родное API построено на событиях; маленькая библиотека idb даёт привычный async/await.", "Код в несколько строк вместо десятков.", "import { openDB } from \"idb\";\n\nconst db = await openDB(\"academy\", 1, {\n  upgrade(db) {\n    db.createObjectStore(\"notes\", { keyPath: \"id\" });\n  }\n});\nawait db.put(\"notes\", { id: \"loops\", text: \"range не включает конец\" });"),
      idea("Версии и upgrade", "Схема базы", "Структуру меняют при открытии с новой версией в обработчике upgrade.", "Как миграции, только в браузере."),
      idea("Индексы", "Быстрый поиск", "Индекс по полю позволяет искать записи не только по ключу: все заметки урока.", "Не нужно перебирать всё хранилище."),
      tip("Большие и структурированные данные — IndexedDB, удобнее через idb. Схема — через версии.")
    ],
    quizzes: [
      single("idb-when", "Когда", "Когда стоит выбрать IndexedDB вместо localStorage?",
        [["big", "Для больших и структурированных данных и файлов"], ["theme", "Для одной настройки темы"], ["secret", "Для паролей"], ["never", "Никогда"]], "big",
        "Асинхронно и без лимита в 5 МБ."),
      single("idb-upgrade", "Схема", "Где создают хранилища объектов?",
        [["upgrade", "В обработчике upgrade при открытии новой версии"], ["anywhere", "Где угодно"], ["server", "На сервере"], ["css", "В CSS"]], "upgrade",
        "Как миграции."),
      single("idb-idb", "idb", "Зачем библиотека idb?",
        [["promise", "Даёт удобный async/await поверх событийного API"], ["server", "Подключает сервер"], ["sql", "Добавляет SQL"], ["none", "Ни за чем"]], "promise",
        "Меньше кода.")
    ]
  });

  L({
    slug: "cache-quota", title: "Cache API и квоты", summary: "Кэш ответов для офлайна, сколько места дают, navigator.storage и постоянное хранилище, очистка.",
    skill: ["wa-cache", "Cache API", "Кэшировать ответы и управлять местом в браузере."],
    now: "Работаем с IndexedDB и сохраняем целые ответы сервера.",
    body: [
      wa("caches", "Хранилище ответов", "caches.open(имя) даёт кэш пар «запрос → ответ». Обычно им управляет Service Worker.", "Страницы и картинки доступны без сети.", "const cache = await caches.open(\"lessons-v1\");\nawait cache.add(\"/courses/python/loops\");\nconst saved = await cache.match(\"/courses/python/loops\");"),
      wa("navigator.storage", "Сколько места", "estimate() показывает занятое и доступное место; persist() просит не очищать данные при нехватке места.", "Понять, поместится ли курс для офлайна.", "const { usage, quota } = await navigator.storage.estimate();\nconsole.log(`${Math.round(usage / quota * 100)}% занято`);"),
      idea("Вытеснение", "Браузер может очистить", "При нехватке места браузер удаляет данные давно не посещённых сайтов, если хранилище не постоянное.", "Не храни единственную копию важного только в браузере."),
      tip("Ответы — Cache API, место — navigator.storage. Важное дублируй на сервере.")
    ],
    quizzes: [
      single("cq-what", "Cache API", "Что хранит Cache API?",
        [["responses", "Пары запрос → ответ"], ["cookies", "Cookie"], ["passwords", "Пароли"], ["dom", "Состояние DOM"]], "responses",
        "Основа офлайна."),
      single("cq-persist", "persist", "Что делает navigator.storage.persist()?",
        [["keep", "Просит браузер не удалять данные сайта при нехватке места"], ["upload", "Загружает данные на сервер"], ["encrypt", "Шифрует данные"], ["clear", "Очищает данные"]], "keep",
        "Браузер может отказать."),
      single("cq-evict", "Вытеснение", "Может ли браузер сам удалить данные сайта?",
        [["yes", "Да, при нехватке места, если хранилище не постоянное"], ["no", "Никогда"], ["server", "Только по команде сервера"], ["user", "Только по нажатию кнопки"]], "yes",
        "Важное — копируй на сервер.")
    ]
  });
}
