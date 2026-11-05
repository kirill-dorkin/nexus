# Git — Хронист

- **Источник полноты:** справочник команд Git (git-scm.com/docs, версия 2.5x) — все porcelain-команды и их основные флаги — плюс ключевые plumbing-команды из «Git Internals».
- **Индекс:** каждая команда с разделом «Options», gitrevisions, gitignore, gitattributes, githooks, конфигурация.
- **Стоит на:** Терминал (ветка «Навигация и файлы»).
- **Эволюции и союзники:** открывает CI/CD (вместе с Docker); союзник для командных проектов (уровень «Архитектор»).
- **Способности:**
  - Снимки;
  - Ветки;
  - Слияние;
  - Удалённые репозитории;
  - История;
  - Спасение;
  - Совместная работа;
  - Изнутри.
- **Объём:** 57 навыков.

## Ветки

### Первый репозиторий (Основа)
- `git-what` — версии файлов, зачем Git, репозиторий, рабочая копия, индекс
- `git-setup` — установка, `git config` (имя, почта, редактор, уровни конфигурации)
- `git-init-clone` — `git init`, `git clone`
- `git-status-add` — `git status`, `git add` (частичное `-p`), индекс
- `git-commit` — `git commit`, сообщения, `--amend`
- `git-log-basics` — `git log`, `--oneline`, `--graph`, `git show`
- `git-diff` — `git diff`, `--staged`, сравнение коммитов и веток
- `git-ignore` — `.gitignore`, глобальный ignore, `git check-ignore`

### Отмена и восстановление (Основа)
- `git-restore` — `git restore`, `--staged`, `--source`
- `git-reset` — `git reset --soft/--mixed/--hard`: что происходит с индексом и файлами
- `git-revert` — `git revert`, отмена слияния
- `git-rm-mv` — `git rm`, `git mv`, `git clean`

### Ветки (Основа)
- `git-branch` — `git branch`, создание, удаление, переименование
- `git-switch` — `git switch`, `git checkout`, detached HEAD
- `git-merge` — `git merge`: fast-forward и merge-коммит, `--no-ff`
- `git-conflicts` — конфликты: маркеры, разрешение, `git mergetool`, `git merge --abort`
- `git-stash` — `git stash`: push, pop, apply, list, ветка из stash

### Удалённые репозитории (Практика)
- `git-remote` — `git remote`, origin, upstream
- `git-fetch-pull` — `git fetch`, `git pull` (merge или rebase), отслеживание веток
- `git-push` — `git push`, `-u`, удаление удалённой ветки, `--force-with-lease`
- `git-auth` — SSH-ключи, токены, credential helper
- `git-forks-prs` — форки, pull request, ревью — модель GitHub и GitLab

### Переписывание истории (Продвинутое)
- `git-rebase` — `git rebase`: как работает, когда нельзя
- `git-rebase-interactive` — `git rebase -i`: squash, fixup, reword, edit, drop, `--autosquash`
- `git-cherry-pick` — `git cherry-pick`, диапазоны, конфликты
- `git-commit-fixup` — `commit --fixup`, `--squash`

### История и поиск (Практика)
- `git-revisions` — указатели: `HEAD~2`, `^`, `@{u}`, диапазоны `..` и `...`
- `git-log-advanced` — фильтры `git log`: `--author`, `--since`, `-S`, `-G`, `--follow`, форматы
- `git-blame` — `git blame`, игнорирование коммитов форматирования
- `git-bisect` — `git bisect`: поиск коммита с ошибкой, `bisect run`
- `git-grep-shortlog` — `git grep`, `git shortlog`, `git describe`

### Спасение (Продвинутое)
- `git-reflog` — `git reflog`: найти потерянное
- `git-recover` — восстановить удалённую ветку, отменить неудачный rebase или reset
- `git-fsck-gc` — `git fsck`, `git gc`, висячие объекты

### Теги и релизы (Практика)
- `git-tags` — лёгкие и аннотированные теги, отправка
- `git-semver-changelog` — семантическое версионирование, журнал изменений
- `git-signing` — подпись коммитов и тегов (GPG/SSH), проверка

### Совместная работа (Практика)
- `git-workflows` — GitHub Flow, trunk-based, Git Flow — сравнение
- `git-commit-style` — хорошие коммиты: атомарность, сообщения, Conventional Commits
- `git-code-review` — ревью: читать дифф, предлагать правки, разрешать обсуждения
- `git-pr-hygiene` — короткие ветки, синхронизация с main, конфликты в PR

### Большие проекты (Полное покрытие)
- `git-submodules` — подмодули
- `git-subtree` — subtree
- `git-worktree` — `git worktree` (как в работе над самим Nexus)
- `git-sparse-partial` — sparse-checkout, частичное клонирование, shallow
- `git-lfs` — Git LFS для больших файлов
- `git-monorepo` — монорепозитории: CODEOWNERS, пути

### Настройка (Полное покрытие)
- `git-config-full` — алиасы, `core.autocrlf`, `pull.rebase`, `init.defaultBranch`, `rerere`
- `git-attributes` — `.gitattributes`: переводы строк, diff и merge драйверы, linguist
- `git-hooks` — хуки: pre-commit, commit-msg, pre-push, серверные хуки
- `git-patches` — `git format-patch`, `git am`, `git apply`

### Изнутри (Изнутри)
- `git-objects` — объекты: blob, tree, commit, tag; `git cat-file`, `git hash-object`
- `git-refs` — ссылки, HEAD, `packed-refs`, `git update-ref`, `git symbolic-ref`
- `git-index-internals` — устройство индекса, `git ls-files`, `git update-index`
- `git-packfiles` — pack-файлы, дельты, `git verify-pack`
- `git-merge-strategies` — стратегии слияния: ort, ours, octopus; трёхстороннее слияние
- `git-transfer` — протоколы передачи, `git ls-remote`, что делает `fetch` на уровне объектов

## Бои

| Ветка | Бой |
|---|---|
| Ветки | Слить две ветки с конфликтом и получить заданную историю |
| Переписывание истории | Привести 7 грязных коммитов к 3 чистым через `rebase -i` |
| История и поиск | Найти `bisect`-ом коммит, сломавший тест |
| Спасение | Восстановить «удалённую» работу по reflog |
| Совместная работа | PR с ревью и разрешёнными замечаниями в учебном репозитории |

**Проверка:** грейдер получает итоговый репозиторий (bundle) и проверяет граф коммитов, ссылки и содержимое. Для «Совместной работы» нужны GitHub-проекты (ADR-0071). До включения грейдера — тест ветки.
