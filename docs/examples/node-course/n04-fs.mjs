// Chapter 4: files and paths — fs/promises, path, directories, watching, JSON files.
import { idea, node, tip, makeLesson } from "./nkit.mjs";

export default function fs(c, rc) {
  const L = makeLesson(c, rc);
  const { single, short } = c;

  L({
    slug: "read-write", title: "Чтение и запись файлов", summary: "readFile и writeFile из node:fs/promises, кодировки, дописывание и синхронные версии.",
    skill: ["node-fs", "Файлы", "Читать и записывать файлы в Node.js."],
    now: "Ловим асинхронные ошибки и начинаем работать с файлами.",
    body: [
      node("readFile", "Прочитать файл", "`await readFile(путь, \"utf8\")` возвращает строку. Без кодировки — Buffer с байтами.", "Чтение настроек, шаблонов, данных.", "import { readFile } from \"node:fs/promises\";\nconst text = await readFile(\"notes.txt\", \"utf8\");"),
      node("writeFile", "Записать файл", "`await writeFile(путь, данные)` создаёт или перезаписывает файл целиком. `appendFile` дописывает в конец.", "Сохранить отчёт, экспорт, кэш.", "await writeFile(\"report.json\", JSON.stringify(data, null, 2));"),
      idea("Синхронные версии", "readFileSync", "У каждой функции есть синхронная версия с суффиксом Sync. Она блокирует цикл событий.", "Допустимо в скриптах и при старте программы, но не в обработчиках запросов сервера."),
      node("Ошибка ENOENT", "Нет такого файла", "Код `ENOENT` значит «файл или папка не найдены». Его проверяют: `if (err.code === \"ENOENT\")`.", "Отсутствующий файл настроек можно обработать: создать со значениями по умолчанию."),
      tip("Файлы — `node:fs/promises` и await. `…Sync` — только в скриптах и при старте.")
    ],
    quizzes: [
      single("rw-encoding", "Кодировка", "Что вернёт `readFile(\"a.txt\")` без указания кодировки?",
        [["buffer", "Buffer с байтами"], ["string", "Строку"], ["json", "Объект"], ["null", "null"]], "buffer",
        "Кодировка \"utf8\" превращает байты в строку."),
      single("rw-sync", "Sync", "Где допустимо использовать readFileSync?",
        [["script", "В скриптах и при старте программы"], ["handler", "В обработчике каждого запроса"], ["never", "Нигде"], ["browser", "Только в браузере"]], "script",
        "В обработчиках он блокирует весь сервер."),
      short("rw-enoent", "Нет файла", "Какой код ошибки означает, что файл не найден?", ["ENOENT", "enoent"],
        "Error NO ENTry.")
    ]
  });

  L({
    slug: "paths-dirs", title: "Пути и папки", summary: "node:path, join и resolve, import.meta.dirname, создание, чтение и удаление папок.",
    skill: ["node-path", "Пути и папки", "Строить пути переносимо и работать с папками."],
    now: "Читаем и пишем файлы и учимся правильно строить пути к ним.",
    body: [
      node("path.join", "Склеить путь", "`join(\"data\", \"users\", \"1.json\")` собирает путь с правильным разделителем для системы: `/` в Linux и macOS, `\\` в Windows.", "Склейка строк через `+ \"/\" +` ломается в Windows.", "import { join } from \"node:path\";\nconst file = join(\"data\", \"users\", `${id}.json`);"),
      node("import.meta.dirname", "Папка этого файла", "В ES-модулях `import.meta.dirname` — папка текущего файла (в CommonJS был `__dirname`). Пути к файлам рядом со скриптом строят от неё.", "Скрипт находит свои файлы, откуда бы его ни запустили.", "const templates = join(import.meta.dirname, \"templates\");"),
      node("path.resolve", "Абсолютный путь", "`resolve(\"logs\")` превращает путь в абсолютный от текущей папки. `basename`, `dirname`, `extname` — имя файла, папка и расширение.", "Получить расширение загружаемого файла или имя без пути."),
      node("mkdir, readdir, rm", "Папки", "`mkdir(путь, { recursive: true })` создаёт цепочку папок, `readdir` — список содержимого, `rm(путь, { recursive: true, force: true })` — удаляет папку целиком.", "Подготовить папку для выгрузки или очистить временные файлы.", "await mkdir(\"out/reports\", { recursive: true });\nconst files = await readdir(\"out\");"),
      tip("Пути — только через `path.join`. Файлы рядом со скриптом — от `import.meta.dirname`.")
    ],
    quizzes: [
      single("pd-join", "Переносимо", "Почему путь собирают через path.join, а не склейкой строк?",
        [["sep", "join подставляет правильный разделитель для любой системы"], ["fast", "Так быстрее"], ["short", "Так короче"], ["same", "Разницы нет"]], "sep",
        "Windows использует обратную косую черту."),
      single("pd-dirname", "Папка файла", "Как в ES-модуле получить папку текущего файла?",
        [["meta", "`import.meta.dirname`"], ["cwd", "`process.cwd()`"], ["home", "`os.homedir()`"], ["dirname", "`__dirname` всегда"]], "meta",
        "cwd — папка запуска, а не файла."),
      single("pd-mkdir", "Цепочка папок", "Как создать папку out/reports, даже если out ещё нет?",
        [["recursive", "`mkdir(\"out/reports\", { recursive: true })`"], ["plain", "`mkdir(\"out/reports\")`"], ["write", "`writeFile(\"out/reports\")`"], ["rm", "`rm(\"out\")`"]], "recursive",
        "Без recursive будет ошибка ENOENT.")
    ]
  });

  L({
    slug: "json-config", title: "JSON-файлы и простое хранилище", summary: "Чтение и запись JSON, атомарная запись через временный файл и почему файл — не база данных.",
    skill: ["node-json", "JSON-файлы", "Хранить простые данные в JSON-файлах безопасно."],
    now: "Строим пути и храним небольшие данные в файлах.",
    body: [
      node("JSON-файл", "Прочитать и разобрать", "`JSON.parse(await readFile(путь, \"utf8\"))` — объект из файла. В ES-модулях можно и `import data from \"./data.json\" with { type: \"json\" }`.", "Настройки, справочники, тестовые данные."),
      node("Атомарная запись", "Через временный файл", "Сначала пишут во временный файл, потом переименовывают его поверх старого: `rename` выполняется целиком или не выполняется вовсе.", "Если программа упадёт посреди записи, старый файл останется целым, а не наполовину пустым.", "await writeFile(`${file}.tmp`, json);\nawait rename(`${file}.tmp`, file);"),
      idea("Файл — не база данных", "Ограничения", "Два запроса, которые одновременно читают, меняют и записывают один JSON-файл, затрут изменения друг друга. Нет индексов и транзакций.", "Для пользователей, заказов и всего, что меняется параллельно, нужна база данных — об этом отдельная глава."),
      tip("JSON-файл — для настроек и справочников. Данные пользователей — в базе.")
    ],
    quizzes: [
      single("jc-atomic", "Атомарно", "Зачем писать сначала во временный файл, а потом делать rename?",
        [["safe", "Чтобы при сбое посреди записи старый файл остался целым"], ["fast", "Чтобы было быстрее"], ["small", "Чтобы файл был меньше"], ["secret", "Чтобы скрыть файл"]], "safe",
        "Переименование не оставляет файл наполовину записанным."),
      single("jc-db", "Не база", "Почему данные заказов не стоит хранить в одном JSON-файле на сервере?",
        [["race", "Параллельные запросы затрут изменения друг друга, нет транзакций и индексов"], ["size", "JSON не может хранить больше 10 записей"], ["text", "JSON — не текст"], ["fine", "Это хорошая идея"]], "race",
        "Для этого есть базы данных."),
      single("jc-parse", "Прочитать", "Как получить объект из файла settings.json?",
        [["parse", "`JSON.parse(await readFile(\"settings.json\", \"utf8\"))`"], ["read", "`await readFile(\"settings.json\")` — сразу объект"], ["require", "`settings.json()`"], ["fetch", "`fetch(\"settings.json\")` в Node.js без сервера"]], "parse",
        "readFile возвращает текст или Buffer, разбирает JSON.parse.")
    ]
  });
}
