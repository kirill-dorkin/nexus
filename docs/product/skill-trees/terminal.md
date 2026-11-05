# Терминал — Заклинатель

- **Источник полноты:**
  - POSIX Shell and Utilities (IEEE Std 1003.1-2024): язык оболочки и обязательные утилиты;
  - справочник Bash 5 (`man bash`) для возможностей сверх POSIX;
  - справочники GNU coreutils, findutils, grep, sed, gawk — ключевые флаги.
- **Индекс:** каждая встроенная команда bash, каждая утилита POSIX, расширения (`${…}`, `$(…)`, glob, перенаправления), управление заданиями.
- **Стоит на:** Операционная система («Файлы и права»).
- **Эволюции и союзники:** открывает Git, Docker, Linux (будущий персонаж); союзник — Node.js и Python (их CLI).
- **Способности:**
  - Навигация;
  - Конвейеры;
  - Текст;
  - Процессы;
  - Скрипты;
  - Удалённая работа;
  - Автоматизация.
- **Объём:** 54 навыка.

## Ветки

### Навигация и файлы (Основа)
- `term-what` — терминал, оболочка (bash, zsh, PowerShell), приглашение, команда и аргументы
- `term-nav` — `pwd`, `cd`, `ls` (`-la`, `-h`), пути, `~`, `-`
- `term-files` — `touch`, `mkdir -p`, `cp -r`, `mv`, `rm -r` и его опасность, `ln -s`
- `term-view` — `cat`, `less`, `head`, `tail -f`, `wc`, `file`
- `term-help` — `man`, `--help`, `type`, `which`, `command -v`, `apropos`
- `term-glob` — шаблоны `*`, `?`, `[…]`, `**`, `{a,b}`, кавычки и экранирование

### Права и пользователи (Основа)
- `term-perms` — `ls -l`, `chmod` (буквы и восьмеричный режим), `chown`, `umask`
- `term-sudo` — `sudo`, `su`, root, принцип наименьших прав
- `term-users` — `whoami`, `id`, группы

### Потоки и конвейеры (Основа)
- `term-redirect` — `>`, `>>`, `<`, `2>`, `2>&1`, `&>`, `/dev/null`, here-doc и here-string
- `term-pipes` — `|`, `tee`, `xargs`, порядок выполнения, код возврата конвейера, `pipefail`
- `term-exit-codes` — `$?`, `&&`, `||`, `;`, `!`

### Текст (Практика)
- `term-grep` — `grep`: `-i`, `-r`, `-n`, `-v`, `-E`, `-o`, `-l`, контекст
- `term-regex` — регулярные выражения BRE и ERE в утилитах
- `term-sed` — `sed`: замена, адреса, `-i`, несколько команд
- `term-awk` — `awk`: поля, условия, агрегаты, `-F`
- `term-sort-uniq` — `sort` (`-n`, `-k`, `-u`), `uniq -c`, `cut`, `tr`, `paste`, `join`, `column`
- `term-diff` — `diff`, `cmp`, `patch`
- `term-jq` — `jq` для JSON (де-факто стандарт)

### Поиск (Практика)
- `term-find` — `find`: имя, тип, размер, время, `-exec`, `-print0`
- `term-locate-fd-rg` — `locate`, `fd`, `ripgrep` как современные альтернативы

### Процессы и задания (Практика)
- `term-processes` — `ps`, `top`/`htop`, PID, родители, `pgrep`
- `term-signals` — `kill`, сигналы TERM, KILL, INT, HUP, `trap`
- `term-jobs` — `&`, `jobs`, `fg`, `bg`, `Ctrl-Z`, `nohup`, `disown`
- `term-resources` — `df`, `du`, `free`, `uptime`, `lsof`

### Окружение (Практика)
- `term-env` — переменные окружения: `export`, `env`, `PATH`, `.bashrc`/`.zshrc`/`.profile`
- `term-aliases-functions` — алиасы и функции оболочки
- `term-history-keys` — история, `Ctrl-R`, `!!`, `!$`, горячие клавиши readline
- `term-prompt-tools` — настройка приглашения, автодополнение

### Скрипты (Продвинутое)
- `term-script-basics` — shebang, `chmod +x`, аргументы `$1`, `$@`, `$#`, `shift`
- `term-variables` — переменные, кавычки, `${var:-default}`, `${#var}`, `${var%…}`, `${var/…/…}`
- `term-conditions` — `if`, `[ ]` и `[[ ]]`, `test`, сравнения строк, чисел и файлов, `case`
- `term-loops` — `for`, `while read`, `until`, `break`/`continue`
- `term-functions-script` — функции, `local`, возврат значений
- `term-arrays` — массивы и ассоциативные массивы bash
- `term-arith` — `$(( ))`, `let`, `bc`
- `term-subshells` — `$(…)`, подоболочки, `{ …; }`, `( … )`, process substitution `<( )`
- `term-strict-mode` — `set -euo pipefail`, `IFS`, отладка `set -x`, `shellcheck`
- `term-getopts` — разбор флагов: `getopts`

### Сеть из терминала (Практика)
- `term-curl` — `curl`: методы, заголовки, данные, `-L`, `-v`, `-o`
- `term-wget-download` — `wget`, проверка контрольных сумм
- `term-net-diag` — `ping`, `traceroute`, `dig`/`nslookup`, `ss`/`netstat`
- `term-ssh` — `ssh`: ключи, `~/.ssh/config`, агент, проброс портов
- `term-scp-rsync` — `scp`, `rsync`

### Архивы и пакеты (Практика)
- `term-archives` — `tar` (`czf`, `xzf`, `tf`), `gzip`, `zip`/`unzip`
- `term-packages` — `apt`, `brew`, `dnf` — установка, обновление, поиск

### Автоматизация (Продвинутое)
- `term-cron` — `cron`, `crontab`, расписание, systemd timers (обзор)
- `term-make` — `make` и Makefile как запуск задач
- `term-tmux` — `tmux`/`screen`: сессии, окна, панели
- `term-editors` — `nano` и выживание в `vim`

### Справочник (Полное покрытие)
- `term-builtins-full` — все встроенные команды bash: `read`, `printf`, `declare`, `eval`, `exec`, `source`, `wait`, `ulimit`, `hash`
- `term-expansions-full` — порядок раскрытий: фигурные скобки, тильда, параметры, команды, арифметика, разбиение на слова, glob; `shopt`
- `term-posix-utilities` — остальные утилиты POSIX: `date`, `sleep`, `tr`, `od`, `split`, `nl`, `fold`, `expand`, `tsort`, `comm`, `basename`/`dirname`, `mktemp`
- `term-zsh-powershell` — отличия zsh и PowerShell для тех, кто на macOS и Windows

## Бои

| Ветка | Бой |
|---|---|
| Потоки и конвейеры | Отчёт по журналу одной командой |
| Текст | Вытащить статистику из логов сервера |
| Процессы | Найти и остановить «зависший» процесс по условиям |
| Скрипты | Скрипт резервного копирования с флагами и проверками |
| Автоматизация | Makefile проекта |

**Проверка:** грейдер запускает скрипт в изолированном контейнере на тестовых данных.
