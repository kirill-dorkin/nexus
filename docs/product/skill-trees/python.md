# Python — Мудрец

- **Источник полноты:** документация docs.python.org для Python 3.14:
  - Language Reference (вся грамматика и модель данных);
  - Library Reference — встроенные функции, типы, исключения и основные модули stdlib: `os`, `pathlib`, `sys`, `re`, `json`, `csv`, `datetime`, `collections`, `itertools`, `functools`, `typing`, `dataclasses`, `enum`, `logging`, `argparse`, `subprocess`, `threading`, `asyncio`, `unittest`, `sqlite3`, `http`, `urllib`, `hashlib`, `random`, `math`, `statistics`, `decimal`, `contextlib`, `abc`;
  - Tutorial.
- **Стоит на:** ПК, Терминал.
- **Эволюции и союзники:** открывает FastAPI, Django (будущие).
- **Способности:**
  - Синтаксис;
  - Коллекции;
  - Функции;
  - Классы;
  - Модули;
  - Ошибки;
  - Асинхронность;
  - Стандартная библиотека.
- **Объём:** 46 навыков.

## Ветки

### Старт (Основа)
- `py-what` — интерпретатор, REPL, запуск скриптов, версии, `venv`
- `py-values-types` — числа, строки, `bool`, `None`, динамическая типизация
- `py-variables-operators` — присваивание, арифметика, сравнения, логика, `:=`
- `py-strings` — строки, срезы, методы, f-строки, t-строки (3.14)
- `py-io` — `print`, `input`, форматирование

### Управление потоком (Основа)
- `py-if-match` — `if`/`elif`/`else`, `match` и шаблоны
- `py-loops` — `for`, `while`, `range`, `break`/`continue`/`else`

### Коллекции (Основа)
- `py-lists-tuples` — списки, кортежи, распаковка
- `py-dicts-sets` — словари и множества, методы
- `py-comprehensions` — включения: списков, словарей, множеств; генераторные выражения
- `py-collections-module` — `collections`: `Counter`, `defaultdict`, `deque`, `namedtuple`, `OrderedDict`, `ChainMap`

### Функции (Основа)
- `py-functions` — `def`, аргументы позиционные и именованные, значения по умолчанию, `*args`, `**kwargs`, `/` и `*`
- `py-scope-closures` — области видимости LEGB, `global`/`nonlocal`, замыкания
- `py-lambda-functional` — `lambda`, `map`/`filter`/`sorted` с `key`, `functools`
- `py-decorators` — декораторы, `functools.wraps`, декораторы с параметрами
- `py-generators` — генераторы, `yield`, `yield from`, `itertools`

### Классы и модель данных (Практика)
- `py-classes` — классы, `__init__`, атрибуты, методы, `self`
- `py-inheritance` — наследование, `super()`, MRO, миксины
- `py-dunder` — модель данных: `__repr__`, `__eq__`, `__hash__`, `__len__`, `__iter__`, `__getitem__`, операторы, контекстные менеджеры
- `py-properties-descriptors` — `property`, дескрипторы, `__slots__`
- `py-dataclasses-enum` — `dataclasses`, `enum`
- `py-abc-protocols` — `abc`, протоколы

### Модули и пакеты (Практика)
- `py-modules` — `import`, пакеты, `__init__.py`, `__name__ == "__main__"`
- `py-packaging` — `pip`, `pyproject.toml`, `uv`, виртуальные окружения, публикация (обзор)

### Ошибки (Практика)
- `py-exceptions` — `try`/`except`/`else`/`finally`, `raise`, свои исключения, цепочки
- `py-exception-groups` — `ExceptionGroup`, `except*`
- `py-context-managers` — `with`, `contextlib`

### Файлы и данные (Практика)
- `py-files-pathlib` — файлы, `pathlib`, кодировки
- `py-json-csv` — `json`, `csv`, `tomllib`
- `py-datetime` — `datetime`, `zoneinfo`, `timedelta`
- `py-regex` — `re`

### Типизация (Практика)
- `py-type-hints` — аннотации, `typing`: `Optional`, `Union` через `|`, `TypedDict`, `Literal`, обобщения, синтаксис `type`
- `py-type-checkers` — mypy и pyright, строгость

### Асинхронность и параллелизм (Продвинутое)
- `py-asyncio` — `async`/`await`, `asyncio.run`, задачи, `TaskGroup`, таймауты
- `py-threads-processes` — `threading`, `multiprocessing`, `concurrent.futures`, GIL и free-threaded Python
- `py-subprocess` — `subprocess`

### Сеть и базы (Практика)
- `py-http` — `urllib`, `http.server`, библиотека httpx (союзник)
- `py-sqlite` — `sqlite3`, DB-API

### Качество (Практика)
- `py-testing` — `unittest`, pytest (союзник), фикстуры, моки
- `py-style-tools` — PEP 8, ruff, форматирование
- `py-logging-cli` — `logging`, `argparse`

### Стандартная библиотека полностью (Полное покрытие)
- `py-stdlib-math` — `math`, `statistics`, `decimal`, `fractions`, `random`, `secrets`
- `py-stdlib-system` — `os`, `sys`, `shutil`, `tempfile`, `platform`, `signal`
- `py-stdlib-text-data` — `string`, `textwrap`, `difflib`, `struct`, `hashlib`, `base64`, `pickle` (и его опасность), `copy`
- `py-stdlib-other` — оставшиеся модули справочника по индексу

### Изнутри (Изнутри)
- `py-internals` — байт-код и `dis`, подсчёт ссылок и сборщик мусора, импорт-система, метаклассы

## Бои

| Ветка | Бой |
|---|---|
| Коллекции | Анализ текста |
| Классы | Модель банковского счёта с тестами |
| Файлы и данные | Конвертер CSV → JSON |
| Асинхронность | Параллельная загрузка с ограничением |
| Качество | Покрыть модуль pytest |

Проверка — грейдер.
