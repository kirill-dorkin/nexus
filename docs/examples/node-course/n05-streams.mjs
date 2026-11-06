// Chapter 5: streams and buffers — Buffer, readable/writable streams, pipeline, backpressure.
import { idea, node, diagram, tip, makeLesson } from "./nkit.mjs";

export default function streams(c, rc) {
  const L = makeLesson(c, rc);
  const { single, short } = c;

  L({
    slug: "buffers", title: "Buffer: байты в Node.js", summary: "Что такое Buffer, кодировки utf8 и base64, длина в байтах и когда нужны двоичные данные.",
    skill: ["node-buffer", "Buffer", "Работать с двоичными данными через Buffer."],
    now: "Храним данные в файлах и спускаемся на уровень байтов.",
    body: [
      node("Buffer", "Массив байтов", "Buffer хранит двоичные данные: содержимое картинки, архива, сетевого пакета. `Buffer.from(\"Привет\")` — байты строки в UTF-8.", "Файлы и сеть на самом деле передают байты, а не строки.", "const buf = Buffer.from(\"Привет\");\nconsole.log(buf.length); // 12 — кириллица по 2 байта"),
      idea("Длина в байтах", "Не равна длине строки", "\"Привет\".length — 6 символов, а в байтах UTF-8 — 12. Ограничения размера загрузок и заголовков считаются в байтах.", "Проверка «не больше 1000 символов» не защищает от тела в 4 КБ."),
      node("base64", "Байты как текст", "`buf.toString(\"base64\")` превращает байты в текст из латиницы и цифр; `Buffer.from(текст, \"base64\")` — обратно.", "Так передают файлы внутри JSON и картинки в data:-ссылках."),
      tip("Строка — символы, Buffer — байты. Размеры и лимиты считай в байтах.")
    ],
    quizzes: [
      single("bf-len", "Байты", "Сколько байт занимает строка \"Привет\" в UTF-8?",
        [["12", "12"], ["6", "6"], ["24", "24"], ["1", "1"]], "12",
        "Кириллическая буква — 2 байта."),
      single("bf-what", "Buffer", "Что хранит Buffer?",
        [["bytes", "Двоичные данные — последовательность байтов"], ["text", "Только текст"], ["objects", "JavaScript-объекты"], ["files", "Имена файлов"]], "bytes",
        "Это основа для файлов и сети."),
      short("bf-b64", "Байты текстом", "Как называется кодировка, которая записывает байты латиницей и цифрами для передачи в JSON?", ["base64"],
        "buf.toString(\"base64\").")
    ]
  });

  L({
    slug: "streams", title: "Потоки данных", summary: "Читаемые и записываемые потоки, обработка файла по частям и pipeline.",
    skill: ["node-streams", "Потоки", "Обрабатывать большие данные по частям через потоки."],
    now: "Знаем Buffer и обрабатываем данные, которые не помещаются в память.",
    body: [
      idea("Поток", "Данные по кусочкам", "Поток выдаёт или принимает данные частями (chunks), а не целиком. Файл на 5 ГБ читается по 64 КБ, и память не кончается.", "Загрузки, выгрузки, видео, большие журналы — всё обрабатывается потоками."),
      diagram({ kind: "flow", title: "Копирование большого файла потоком", steps: [
        { title: "createReadStream", text: "Читает файл частями" },
        { title: "createGzip", text: "Сжимает каждую часть на лету" },
        { title: "createWriteStream", text: "Пишет части в новый файл" }
      ] }),
      node("pipeline", "Соединить потоки", "`await pipeline(источник, преобразование, приёмник)` соединяет потоки, следит за ошибками и закрывает все потоки при сбое.", "Ручное соединение через .pipe() теряет ошибки и оставляет открытые файлы.", "import { pipeline } from \"node:stream/promises\";\nimport { createReadStream, createWriteStream } from \"node:fs\";\nimport { createGzip } from \"node:zlib\";\nawait pipeline(\n  createReadStream(\"access.log\"),\n  createGzip(),\n  createWriteStream(\"access.log.gz\")\n);"),
      node("Построчное чтение", "readline", "`for await (const line of createInterface({ input: createReadStream(file) }))` перебирает огромный файл по строкам.", "Анализ журнала на миллионы строк без загрузки в память."),
      tip("Большие данные — потоками и `pipeline`, а не `readFile` целиком.")
    ],
    quizzes: [
      single("st-why", "Зачем", "Почему файл на 5 ГБ обрабатывают потоком, а не readFile?",
        [["memory", "readFile загрузит всё в память, поток — по частям"], ["speed", "readFile не умеет читать такие файлы"], ["text", "Потоки работают только с текстом"], ["same", "Разницы нет"]], "memory",
        "Поток держит в памяти только текущий кусок."),
      single("st-pipeline", "pipeline", "Чем pipeline лучше ручного .pipe()?",
        [["errors", "Обрабатывает ошибки и закрывает все потоки при сбое"], ["speed", "Быстрее"], ["gzip", "Сам сжимает"], ["none", "Ничем"]], "errors",
        "С .pipe() ошибка может потеряться."),
      single("st-lines", "По строкам", "Как перебрать строки огромного журнала без загрузки целиком?",
        [["readline", "readline поверх createReadStream и for await"], ["split", "readFile и split(\"\\n\")"], ["json", "JSON.parse"], ["grep", "Это невозможно в Node.js"]], "readline",
        "readline читает поток и отдаёт строки по одной.")
    ]
  });

  L({
    slug: "backpressure", title: "Обратное давление и Web Streams", summary: "Почему быстрый источник переполняет медленный приёмник, highWaterMark и потоки fetch.",
    skill: ["node-backpressure", "Обратное давление", "Понимать обратное давление и работать с потоками fetch."],
    now: "Соединяем потоки и разбираемся, что происходит, когда одна сторона быстрее другой.",
    body: [
      idea("Обратное давление", "Backpressure", "Если источник выдаёт данные быстрее, чем приёмник успевает их записать, данные копятся в памяти. Потоки умеют приостанавливать источник, пока приёмник не освободится.", "pipeline делает это сам; ручной цикл write без проверки результата может съесть всю память."),
      idea("highWaterMark", "Размер буфера", "Порог, после которого поток просит источник подождать (по умолчанию 64 КБ для файлов).", "Баланс между скоростью и расходом памяти."),
      node("Web Streams", "Потоки fetch", "Тело ответа fetch — `ReadableStream` из стандарта Web Streams. В Node.js его можно читать `for await` и превращать в поток Node через `Readable.fromWeb`.", "Скачивание большого файла по сети прямо в файл без загрузки в память.", "const res = await fetch(url);\nawait pipeline(Readable.fromWeb(res.body), createWriteStream(\"video.mp4\"));"),
      tip("Доверь давление `pipeline`. Ответ fetch — тоже поток: не делай `await res.text()` для гигабайтов.")
    ],
    quizzes: [
      single("bp-what", "Давление", "Что такое обратное давление в потоках?",
        [["pause", "Механизм, который притормаживает быстрый источник, пока медленный приёмник не освободится"], ["speed", "Ускорение потока"], ["error", "Ошибка записи"], ["compress", "Сжатие данных"]], "pause",
        "Иначе данные копятся в памяти."),
      single("bp-fetch", "fetch", "Каким типом является res.body у fetch?",
        [["web", "ReadableStream (Web Streams)"], ["buffer", "Buffer"], ["string", "Строкой"], ["json", "Объектом JSON"]], "web",
        "Его можно читать по частям."),
      single("bp-big", "Большой ответ", "Как сохранить гигабайтный файл из сети, не держа его в памяти?",
        [["pipe", "Передать res.body потоком в createWriteStream через pipeline"], ["text", "`await res.text()` и writeFile"], ["json", "`await res.json()`"], ["buffer", "`await res.arrayBuffer()` целиком"]], "pipe",
        "Остальные варианты читают ответ целиком.")
    ]
  });
}
