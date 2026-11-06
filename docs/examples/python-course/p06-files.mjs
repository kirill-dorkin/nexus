// Chapter 6: string methods and files — split/join, with open, pathlib, CSV and JSON.
import { py, tip, makeLesson } from "./pykit.mjs";

export default function files(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi, short } = c;

  L({
    slug: "string-methods", title: "Методы строк", summary: "strip, lower, replace, split и join, startswith, проверки и форматирование.",
    skill: ["py-text", "Методы строк", "Чистить и разбирать текст методами строк."],
    now: "Владеем функциями и учимся обрабатывать текст.",
    body: [
      py("Очистка", "strip, lower, upper", "`s.strip()` убирает пробелы по краям, `lower()` и `upper()` меняют регистр.", "Ввод пользователя почти всегда нужно почистить: « Anna@Example.com » → «anna@example.com».", "email = input(\"Почта: \").strip().lower()"),
      py("split и join", "Разрезать и склеить", "`\"a,b,c\".split(\",\")` даёт список, `\", \".join(items)` собирает строку.", "Разбор строк CSV, тегов, команд; красивый вывод списков.", "tags = \"python, курс, новичок\".split(\", \")\nprint(\" | \".join(tags))"),
      py("replace и find", "Заменить и найти", "`s.replace(\"old\", \"new\")`, `s.find(\"x\")` — индекс или -1, `s.count(\"x\")` — сколько раз.", "Быстрые правки текста без регулярных выражений."),
      py("Проверки", "startswith, isdigit", "`startswith`, `endswith`, `isdigit`, `isalpha` возвращают True или False.", "Проверить расширение файла или что ввод — число."),
      tip("strip().lower() для ввода, split для разбора, join для сборки.")
    ],
    quizzes: [
      single("sm-split", "split", "Что вернёт \"a b c\".split()?",
        [["list", "['a', 'b', 'c']"], ["str", "'abc'"], ["tuple", "('a', 'b', 'c')"], ["one", "['a b c']"]], "list",
        "Без аргумента режет по пробелам."),
      single("sm-join", "join", "Как склеить список words через запятую с пробелом?",
        [["join", "`\", \".join(words)`"], ["wjoin", "`words.join(\", \")`"], ["plus", "`words + \", \"`"], ["concat", "`concat(words)`"]], "join",
        "join — метод строки-разделителя."),
      single("sm-immut", "Неизменяемость", "Что выведет `s = \"hi\"; s.upper(); print(s)`?",
        [["same", "hi"], ["upper", "HI"], ["none", "None"], ["error", "Ошибку"]], "same",
        "Метод вернул новую строку, а s не изменилась.")
    ]
  });

  L({
    slug: "files-io", title: "Файлы", summary: "open и with, режимы r, w, a, кодировка, чтение построчно и pathlib.",
    skill: ["py-files", "Работа с файлами", "Читать и записывать текстовые файлы."],
    now: "Обрабатываем текст и сохраняем его в файлы.",
    body: [
      py("with open", "Открыть и закрыть", "`with open(path, encoding=\"utf-8\") as f:` — файл сам закроется после блока, даже при ошибке.", "Незакрытые файлы теряют данные и держат ресурсы.", "with open(\"notes.txt\", encoding=\"utf-8\") as f:\n    for line in f:\n        print(line.strip())"),
      py("Режимы", "r, w, a", "`\"r\"` — чтение (по умолчанию), `\"w\"` — запись с перезаписью, `\"a\"` — дописать в конец.", "Режим w стирает файл — частая неприятная неожиданность.", "with open(\"log.txt\", \"a\", encoding=\"utf-8\") as f:\n    f.write(\"урок пройден\\n\")"),
      py("Кодировка", "encoding=\"utf-8\"", "Всегда указывай кодировку: в Windows по умолчанию может быть другая, и кириллица превратится в кракозябры.", "Одна строка избавляет от UnicodeDecodeError."),
      py("pathlib", "Пути как объекты", "`Path(\"data\") / \"report.txt\"` склеивает пути под любую систему, `p.exists()`, `p.read_text()`, `p.glob(\"*.csv\")`.", "Современный способ работы с путями вместо склейки строк.", "from pathlib import Path\nfor p in Path(\"data\").glob(\"*.csv\"):\n    print(p.name)"),
      tip("Всегда `with open(..., encoding=\"utf-8\")`. Режим w стирает файл.")
    ],
    quizzes: [
      single("fi-with", "with", "Зачем открывать файл через with?",
        [["close", "Файл закроется автоматически, даже при ошибке"], ["fast", "Так быстрее читать"], ["lock", "Чтобы другие не могли открыть"], ["create", "Чтобы создать папку"]], "close",
        "Контекстный менеджер сам вызывает close."),
      single("fi-w", "Режим w", "Что сделает open(\"a.txt\", \"w\") с существующим файлом?",
        [["erase", "Очистит его и запишет заново"], ["append", "Допишет в конец"], ["error", "Выдаст ошибку"], ["read", "Откроет для чтения"]], "erase",
        "Для дописывания — режим a."),
      single("fi-enc", "Кодировка", "Что лучше всегда указывать при открытии текстового файла?",
        [["utf8", "encoding=\"utf-8\""], ["size", "Размер файла"], ["lines", "Число строк"], ["binary", "Режим b"]], "utf8",
        "Иначе кириллица может сломаться.")
    ]
  });

  L({
    slug: "csv-json", title: "CSV и JSON", summary: "Модули csv и json: чтение таблиц, DictReader, json.load и json.dump, ensure_ascii.",
    skill: ["py-json", "CSV и JSON", "Читать и записывать данные в форматах CSV и JSON."],
    now: "Работаем с текстовыми файлами и переходим к структурированным данным.",
    body: [
      py("csv.DictReader", "Таблица как словари", "Каждая строка CSV становится словарём с ключами из заголовка.", "Выгрузки из таблиц и отчётов разбираются в пару строк.", "import csv\nwith open(\"students.csv\", encoding=\"utf-8\") as f:\n    for row in csv.DictReader(f):\n        print(row[\"name\"], row[\"score\"])"),
      py("json.load", "JSON → Python", "`json.load(f)` читает файл, `json.loads(text)` — строку. Объекты становятся словарями, массивы — списками.", "Настройки, ответы API, обмен данными между программами."),
      py("json.dump", "Python → JSON", "`json.dump(data, f, ensure_ascii=False, indent=2)` — с кириллицей и отступами.", "Без ensure_ascii=False русский текст превратится в \\u0410…", "import json\nwith open(\"progress.json\", \"w\", encoding=\"utf-8\") as f:\n    json.dump(progress, f, ensure_ascii=False, indent=2)"),
      py("Числа из CSV", "Всё — строки", "csv отдаёт значения строками: `int(row[\"score\"])`.", "Иначе «90» > «100» при сравнении строк."),
      tip("CSV — DictReader, JSON — load и dump с ensure_ascii=False. Из CSV всё приходит строками.")
    ],
    quizzes: [
      single("cj-type", "JSON-объект", "Во что превращается JSON-объект после json.load?",
        [["dict", "В словарь"], ["list", "В список"], ["str", "В строку"], ["tuple", "В кортеж"]], "dict",
        "Массив — в список."),
      single("cj-ascii", "Кириллица", "Зачем ensure_ascii=False в json.dump?",
        [["cyr", "Чтобы русский текст записался буквами, а не кодами \\u"], ["fast", "Для скорости"], ["small", "Чтобы файл был меньше в 10 раз"], ["valid", "Иначе JSON невалиден"]], "cyr",
        "С кодами файл тоже валиден, но нечитаем."),
      single("cj-csv", "Значения CSV", "Какого типа row[\"score\"] из csv.DictReader?",
        [["str", "Строка"], ["int", "Число"], ["float", "Дробное число"], ["auto", "Зависит от содержимого"]], "str",
        "Преобразуй через int().")
    ]
  });
}
