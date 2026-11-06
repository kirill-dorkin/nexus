// Chapter 8: modules, packages, pip and virtual environments.
import { py, cmd, idea, tip, makeLesson } from "./pykit.mjs";

export default function modules(c, rc) {
  const L = makeLesson(c, rc);
  const { single, multi, short } = c;

  L({
    slug: "import", title: "Модули и import", summary: "import и from, свои модули, __name__ == \"__main__\" и стандартная библиотека.",
    skill: ["py-import", "Модули", "Разбивать код на модули и подключать стандартную библиотеку."],
    now: "Умеем отлаживать и раскладываем код по файлам.",
    body: [
      py("import", "Подключить модуль", "`import math` и `math.sqrt(16)`; `from datetime import date` — взять одно имя; `import numpy as np` — короткое имя.", "Не нужно писать всё самому: готовый код уже есть.", "from datetime import date\nprint(date.today().isoformat())"),
      py("Свой модуль", "Любой .py-файл", "Файл utils.py рядом с программой подключается как `import utils` или `from utils import slugify`.", "Большая программа делится на понятные части."),
      py("__main__", "Запуск или импорт", "Код под `if __name__ == \"__main__\":` выполняется только при прямом запуске файла, а не при импорте.", "Модуль можно и импортировать, и запускать как скрипт.", "def main():\n    print(\"Запуск\")\n\nif __name__ == \"__main__\":\n    main()"),
      idea("Стандартная библиотека", "Батарейки в комплекте", "math, random, datetime, pathlib, json, csv, collections, itertools, re, statistics — уже установлены вместе с Python.", "Прежде чем ставить пакет, проверь, нет ли решения в стандартной библиотеке."),
      tip("Один файл — один модуль. Точку входа прячь под `if __name__ == \"__main__\":`.")
    ],
    quizzes: [
      single("im-from", "from", "Как подключить только функцию sqrt из math?",
        [["from", "`from math import sqrt`"], ["import", "`import sqrt from math`"], ["use", "`use math.sqrt`"], ["require", "`require(\"math\").sqrt`"]], "from",
        "Порядок как в фразе: из math взять sqrt."),
      single("im-main", "__main__", "Когда выполняется код под if __name__ == \"__main__\"?",
        [["direct", "Только при прямом запуске файла"], ["import", "Только при импорте"], ["always", "Всегда"], ["never", "Никогда"]], "direct",
        "При импорте __name__ равно имени модуля."),
      multi("im-std", "Встроено", "Какие модули входят в стандартную библиотеку?",
        [["json", "json"], ["datetime", "datetime"], ["random", "random"], ["requests", "requests"]], ["json", "datetime", "random"],
        "requests ставят отдельно.")
    ]
  });

  L({
    slug: "venv-pip", title: "Пакеты и окружения", summary: "pip, PyPI, виртуальное окружение venv, requirements.txt и менеджер uv.",
    skill: ["py-venv", "Окружения и пакеты", "Создавать виртуальное окружение и ставить пакеты."],
    now: "Подключаем модули и ставим сторонние пакеты правильно.",
    body: [
      cmd("python3 -m venv .venv", "Виртуальное окружение", "Отдельная папка с Python и пакетами для одного проекта. Активация: `source .venv/bin/activate`, в Windows — `.venv\\Scripts\\activate`.", "У разных проектов разные версии пакетов — они не мешают друг другу.", "python3 -m venv .venv\nsource .venv/bin/activate"),
      cmd("pip install", "Поставить пакет", "`pip install requests` ставит пакет из каталога PyPI в активное окружение.", "Готовые решения для HTTP, таблиц, графиков и тысяч других задач."),
      cmd("requirements.txt", "Список зависимостей", "`pip freeze > requirements.txt` сохраняет версии, `pip install -r requirements.txt` ставит их на другом компьютере.", "Коллега получает ровно то же окружение."),
      cmd("uv", "Быстрый менеджер", "uv создаёт окружение и ставит пакеты в десятки раз быстрее: `uv venv`, `uv pip install`, `uv run script.py`.", "Современная замена связке venv и pip."),
      idea("Не ставь глобально", "sudo pip — плохая идея", "Пакеты в системный Python ломают системные программы. Всегда работай в окружении.", "Окружение удаляется одной командой, система — нет."),
      tip("Каждому проекту — своё .venv. Версии пакетов — в requirements.txt.")
    ],
    quizzes: [
      single("vp-why", "Зачем venv", "Зачем нужно виртуальное окружение?",
        [["isolate", "Чтобы пакеты разных проектов не конфликтовали"], ["speed", "Чтобы Python работал быстрее"], ["vpn", "Это VPN для Python"], ["cloud", "Чтобы запускать в облаке"]], "isolate",
        "У каждого проекта — свои версии."),
      single("vp-req", "Повторить окружение", "Как поставить пакеты по списку из requirements.txt?",
        [["r", "`pip install -r requirements.txt`"], ["file", "`pip requirements.txt`"], ["load", "`python requirements.txt`"], ["all", "`pip install all`"]], "r",
        "Флаг -r читает файл."),
      short("vp-cmd", "Команда", "Какой командой (модулем) создают окружение: python3 -m ...?", ["venv"],
        "python3 -m venv .venv.")
    ]
  });

  L({
    slug: "stdlib-tour", title: "Полезная стандартная библиотека", summary: "random, datetime, collections.Counter и defaultdict, itertools, re для поиска по шаблону.",
    skill: ["py-stdlib", "Стандартная библиотека", "Решать типовые задачи модулями стандартной библиотеки."],
    now: "Умеем ставить пакеты и пользуемся тем, что уже есть в Python.",
    body: [
      py("random", "Случайность", "`random.choice(items)`, `random.randint(1, 6)`, `random.shuffle(items)`.", "Перемешать вопросы теста, выбрать случайный совет.", "import random\nquestion = random.choice(questions)"),
      py("datetime", "Даты и время", "`datetime.now()`, разница дат через timedelta, формат `strftime(\"%d.%m.%Y\")`.", "Сроки, дедлайны, «сколько дней до конца курса»."),
      py("Counter", "Подсчёт", "`Counter(words).most_common(3)` — три самых частых.", "Анализ текста и журналов в одну строку.", "from collections import Counter\nprint(Counter(\"abracadabra\").most_common(2))  # [('a', 5), ('b', 2)]"),
      py("defaultdict", "Словарь со значением по умолчанию", "`defaultdict(list)` сам создаёт пустой список для нового ключа.", "Группировка: ученики по курсам без проверок ключа."),
      py("re", "Регулярные выражения", "`re.findall(r\"\\d+\", text)` — все числа в тексте, `re.sub` — замена по шаблону.", "Найти телефоны, даты, адреса в тексте."),
      tip("Посчитать — Counter, сгруппировать — defaultdict, найти по шаблону — re.")
    ],
    quizzes: [
      single("sb-counter", "Частоты", "Как проще всего найти три самых частых слова?",
        [["counter", "`Counter(words).most_common(3)`"], ["sort", "`sorted(words)[:3]`"], ["set", "`set(words)`"], ["max", "`max(words)`"]], "counter",
        "Counter создан для подсчёта."),
      single("sb-dd", "Группировка", "Что делает defaultdict(list) при обращении к новому ключу?",
        [["create", "Создаёт пустой список для ключа"], ["error", "Вызывает KeyError"], ["none", "Возвращает None"], ["skip", "Пропускает ключ"]], "create",
        "Можно сразу делать append."),
      single("sb-rand", "Случайный элемент", "Как выбрать случайный элемент списка?",
        [["choice", "`random.choice(items)`"], ["rand", "`random(items)`"], ["pick", "`items.random()`"], ["shuffle", "`random.shuffle(items)[0]`"]], "choice",
        "shuffle перемешивает на месте и возвращает None.")
    ]
  });
}
