# Hero Lab — аудит и три концепции

Дата: 13 октября 2026. Только Web presentation. Главная страница, её SEO, каталог, блог и бизнес-команды сохранены. `/ui/hero-lab` — отдельная noindex-страница для выбора направления, не утверждённый редизайн.

## Источники и границы

Проверены `main` (`c4e910b`) и Draft PR #88, исходный head `b003c091`. README/SKILL и `references/hig-lookup.md` из `dickwu/apple-design-skill` прочитаны; использованы accessibility, layout, typography, color, design-principles, branding, buttons, materials, liquid-glass, dark-mode, motion, writing и cross-platform. Это принципы для веба, а не предписание копировать Apple. Пользовательские темы/акценты важнее рекомендации HIG не давать отдельный переключатель темы.

Прочитаны AGENTS, README, current-state, foundation, module-boundaries, CONTRIBUTING, development-workflow, ui-library roadmap, ui-design-brief, UI README и связанные ADR-0054/0055/0058/0059/0060. ADR-0059 остаётся Proposed: галерея не превращает его автоматически в принятое архитектурное решение.

Два приложенных изображения отсутствовали по предоставленным scratch-путям. Они не использовались как доказательства. Аудит основан на действующей Preview-странице, её DOM/CSS и браузерных снимках. Для 320/390/768/1440 использованы настоящие iframe viewport, а не ширина отдельного контейнера. Это проверка веб-layout в Chromium, не эмуляция физического телефона.

## Summary

Оценка: **Needs work**. Тезис существующего hero — понимать IT и применять знания. Но иллюстрация показывает только статичный HTML-пример; видео, задания, проверка и прогресс не образуют убедительного общего маршрута. Узнаваемость пока обеспечивается порталом и крупным заголовком, а не устройством обучения.

## Critical

Подтверждённых критических accessibility-ошибок в исследованном hero не обнаружено. Это не сертификат доступности: скринридер, физические устройства, изменение системных media preferences и полный контраст текста поверх полупрозрачной старой сцены не проверены.

## Improvements

| What | Why | Fix | severity |
| --- | --- | --- | --- |
| На desktop две области 1.02fr/0.98fr с резким изменением фона. Гипотеза 50/50 подтверждена. | `layout.md › Visual hierarchy`: связанные элементы должны читаться как связанные. Восприятие механического разреза — дизайнерское суждение. | Смысл и доказательство объединить в открытый разворот, маршрут или один урок. | High |
| Заголовок 81.225 px при 1440 и 46.875 px при 390; line-height .98, tracking -.075em и max-width 10.5ch. Словосочетание «Применять знания» разрывается. | `typography.md › Conveying hierarchy`; оценка тяжести переносов — дизайнерское суждение. | Сдержанный display до 64 px, 36 px mobile, line-height 1.1, смысловые русские строки. | High |
| Заголовок, пример, портал и appearance control имеют отдельные центры внимания. | `design-principles.md › Simplicity`; конкуренция центров — дизайнерское суждение. | Одна содержательная signature-сцена, нейтральное окружение. | High |
| Правая часть — пример конспекта, не демонстрация учебного цикла; надпись LIVE над статическим содержимым двусмысленна. | `writing.md › Getting started`, ясность назначения; `design-principles.md › Responsibility`. | Показать материал → действие → обратную связь; назвать пример концептуальным. | High |
| Привязка к конкретному вводному курсу не подтверждена: hero показывает HTML, а реальный каталог — компьютерную грамотность. Подтверждается более узкая проблема: платформа сведена к первому HTML-примеру. | `design-principles.md › Purpose`. | Текст представляет платформу целиком; учебный фрагмент служит примером подхода. | High |
| «Выбрать курс» ведёт к #courses; вторичное «Читать блог» полезно, но не объясняет практику. Слабость действия — частично подтверждённое дизайнерское суждение. | `buttons.md › Content`, `writing.md › Best practices`. | Главный CTA непосредственно /courses; вторичный ведёт к живому примеру. Блог сохраняется в меню/футере. | Medium |
| «Тема и цвет» наложен на верхний край hero на desktop. На mobile вынесен выше, поэтому замечание применимо не ко всем ширинам. | `layout.md › Visual hierarchy`; оценка вмешательства — дизайнерское суждение. | В концепциях это периферийный функциональный контрол вне учебной сцены. Окончательное место выбирается при переносе. | Medium |
| Зелёный не является фиксированным акцентом: доступны rose/violet/blue/teal/amber, исходно выбран rose. Artwork реагирует на accent через фильтр, но правая сцена всегда #18182c. | `color.md › Best practices`, `dark-mode.md › Dark Mode colors`. | Содержательная графика использует те же семантические токены; нет отдельного неизменяемого тёмного острова. | Medium |
| Hero содержит рамку, стеклянный конспект и вложенную рамку pre. | `materials.md › Liquid Glass`, `liquid-glass.md › The two layers`. | Устойчивые непрозрачные материалы; группировка интервалами и небольшим числом разделителей. | High |
| Смысл → доказательство → действие не складываются в одну последовательность. На mobile HTML-сцена появляется после обоих CTA. | `layout.md › Visual hierarchy`; композиционный вывод — дизайнерское суждение. | Ясный тезис, непосредственно связанный учебный пример и понятные действия; основной CTA доступен до длинного примера. | High |

## Craft notes

- **What:** декоративный портал не объясняет конкретный учебный переход. **Why:** `design-principles.md › Delight`; связать выразительность с содержанием — дизайнерское суждение. **Fix:** имя файла меняется из правила в практический результат, маршрут связывает этапы, вопрос даёт местную обратную связь. **severity:** High.
- **What:** рамки используются чаще, чем требует иерархия. **Why:** `branding.md › Best practices`, приоритет содержания. **Fix:** убрать общий enclosing hero-card и стекло из чтения. **severity:** Medium.

## What works

Сохраняем реальный каталог, честную маркировку Preview, Onest с кириллицей, публичный блог, нативные ссылки/кнопки/диалоги, system/light/dark и пять акцентов. Гостевой header уже не показывает «Моё обучение»: повторное исправление не требуется. Существующий session-aware LearningNavigation переиспользован без изменения запросов или политик.

## Platform notes

`cross-platform.md › Vocabulary`: semantic colors переводятся в CSS variables, масштаб текста — в zoom/rem, доступность — в HTML/ARIA и клавиатуру. Не добавлены SF Pro/SF Symbols, Apple-specific tab bars, WebGL или библиотека эффектов. Стекло остаётся только в существующем небольшом appearance control; контент новых концепций непрозрачен.

Браузерные шаги старого hero:

| Шаг | Viewport | Общая оценка |
| --- | --- | --- |
| 1 | 320 | Переполнения нет; длинный stacked hero, доказательство ниже CTA. |
| 2 | 390 | Переполнения нет; перенос «Применять знания» остаётся тяжёлым. |
| 3 | 768 | Переполнения нет; обе половины тесные, заголовок HTML-примера переносится. |
| 4 | 1440 | Переполнения нет; устойчивое 50/50 и несколько независимых акцентов. |

## Три реализованных направления

| Решение | Редакционная сцена | Путь обучения | Фрагмент урока |
| --- | --- | --- | --- |
| Тезис | Знание становится навыком. | От «понятно» к «умею». | Разобрались. Попробовали. Научились. |
| Структура | Открытое вступление; ниже поля издания, конспект и применение одного правила. | Центрированное вступление; один связный маршрут; выбранный этап с объяснением. | Вступление; один лист урока, где материал соседствует с проверкой. |
| Signature | Подчёркнутая формула имени файла превращается в полезное имя через действие. | Линия соединяет понять, попробовать, получить отзыв и увидеть прогресс. | Правильный/ошибочный ответ меняет обратную связь рядом с вопросом. |
| Типографика | Onest 600 для тезиса, 500 для материала, маленькие редакционные подписи. | Компактный тезис, названия этапов важнее декоративного маршрута. | Тезис отдельно от читаемого текста урока, нативные поля без декоративной оболочки. |
| CTA | Desktop рядом со вступлением, mobile под ним. /courses + посмотреть пример. | Под тезисом. /courses + пройти путь в примере. | Перед фрагментом. /courses + попробовать фрагмент. |
| Графика | HTML-документ, имя файла и тип .pdf; не screenshot страницы. | Один лёгкий SVG и HTML-контролы; без графической библиотеки. | HTML-пример переименования, radio и текстовая обратная связь. |
| Mobile | Поля, конспект и действие последовательно, без скрытого содержания. | Этапы складываются в 2×2, детали идут ниже; нет карусели. | Конспект над проверкой, действия на всю доступную ширину. |
| Light / dark | Светлый фон / глубокий сливовый; тот же учебный разворот. | Светлый / сливовый; линия и выбранный этап получают адаптивный контраст. | Непрозрачный светлый / сливовый лист; читаемые поля обеих тем. |
| Accent | Меняются CTA, подчёркивание и тип файла; текст остаётся нейтральным. | Меняются CTA, линия и выбранный узел; смысл отмечен текстом и aria-pressed. | Меняются CTA и ориентир файла; success/warning независимы от accent. |
| Motion | Изменяется имя; нет непрерывной анимации. | Переход текста 180 ms после действия; reduced-motion отключает его. | Обратная связь текстом, без запуска анимации. |
| Удалено | Общая оболочка, портал, pre внутри карточки, LIVE и несвязанный блог-CTA. | Дашборд, сферы, карточки этапов, декоративные номера и autoplay. | Видео-постер без видео, множество карточек, фальшивый прогресс и лишняя графика. |

Проверка на шаблонность: общий layout сам по себе можно использовать в другом продукте. Поэтому каждая композиция связана с артефактом обучения: правило и применение, переход к проверке обязательных заданий, конкретный вопрос и повторная попытка. Без этих элементов концепции теряют смысл; их нельзя перенести в CRM или финансовый SaaS без содержательной переработки. Это дизайнерское суждение, не цитата HIG.

## Рекомендация

Выбрать **Путь обучения**: он быстрее остальных объясняет Nexus целиком, связывает видео/конспект, практику, проверку и прогресс, сохраняя курс как главное действие. Редакционная сцена спокойнее, но её доказательство уже; фрагмент урока наиболее конкретен, но снова делает один урок главным представителем платформы. Рекомендация — дизайнерское суждение. Ни один вариант не переносится на / до выбора пользователя.

## Проверка и ограничения

- Локальные production Web build, TypeScript и brand isolation прошли. Новых зависимостей нет.
- Все три композиции: 320/390/768/1440 в браузерном iframe, без горизонтального overflow. Длинные русские заголовки видны полностью.
- Работают действие переименования, переключение этапов, ошибочный ответ, повтор и правильный ответ. Демонстрации не вызывают API и не пишут прогресс.
- Светлая/тёмная темы и все пять accent presets применились через существующий appearance control; CSS-значения сняты после завершения cross-frame storage update. Основной текст: 14.51:1 light, 17.98:1 dark; вторичный: 5.12:1 / 9.22:1. Белый текст основных кнопок: rose 5.71:1, violet 5.99:1, blue 6.49:1, teal 5.35:1, amber 5.34:1.
- Контент не использует backdrop-filter. CSS reduced-motion и существующий reduced-transparency fallback проверены по исходникам; системное переключение этих media preferences в cloud browser не эмулировано.
- Гость проверен на настоящем session-aware header. Вход под реальным пользователем и его персональный прогресс в новой лаборатории отдельно не проверены; общий компонент и канонические команды не менялись.
- Loading/error/empty каталог и серверные бизнес-сценарии лаборатория не вводит и не заменяет. Их отдельная новая визуальная проверка не выполнена; не заявляется на основании старых PR-записей.
- Нет нового шрифта/растра или непрерывного эффекта; это снижает риск CLS и нагрузки, но не доказывает нулевой CLS или производительность физического мобильного браузера. Lighthouse, Safari/Android, скринридеры и 200% zoom остаются непроверенными.
- Снимки фиксированных viewport могут быть сняты через масштаб лаборатории, чтобы поместить композицию в cloud browser. Масштаб меняет только просмотр iframe, а не layout viewport. Это следует отличать от device screenshots.

Изменённые продуктовые файлы: `apps/web/src/app/ui/hero-lab/page.tsx`, `hero-lab.tsx`, `hero-lab.module.css`. Документация: этот файл. Backend, session, tenant/RLS, membership, Enrollment, attempts, Evidence, канонический progress и outbox не затронуты. PR остаётся Draft; Production не публикуется.

## Revised direction: String Lab

The maintainer rejected the first three concepts as too dry and supplied
`kirill-dorkin/15-js-7` as the preferred visual reference. Its current README,
HTML, CSS and slide source were read, and the deployed cover, quiz and live
search slides were inspected in the browser. This changes the visual direction,
not the requirement to keep the real homepage untouched until selection.

Borrowed principles: dense bold Cyrillic hierarchy; quiet rounded paper;
small pale accent annotations; dark, readable instructional code; a visible
input → operation → result. Onest and the existing five accent preferences
remain. The reference logo, Manrope/DM Mono downloads, slide chrome, fixed
viewport shell, nested glass, glowing artwork and 50/50 cover are not copied.
These composition decisions are **дизайнерское суждение**; see
`branding.md › Best practices` and `design-principles.md › Purpose`.

| Concept | Revised composition and signature |
| --- | --- |
| Editorial | One paper spread: a large two-line thesis above a marginal lesson note and a dark text processor. `.trim()` visibly removes edge spaces when clicked. CTA follows the introductory copy. |
| Learning path | One continuous plum scene: centered thesis, a curved route and four accessible selectable stations; the selected operation is explained below. The active station is a tilted solid accent tile, not an extra card. CTA precedes the route. |
| Product fragment | Compact introductory masthead followed by one lesson: a readable syntax example and an immediately answerable quiz. The original text and result share one dark code surface. CTA sits at the masthead edge on desktop. |

All examples now use a deliberately labelled JavaScript text transformation,
not a fabricated published course or learner result. The platform copy still
names courses, video, notes, practice, quizzes and progress. The examples are
local only; no attempt, Evidence, enrollment or progress write is performed.

Mobile: the editorial spread and lesson become a reading sequence; the path
becomes four vertical stations. Light theme uses white paper; dark theme uses
existing plum paper tokens. The path and code remain opaque plum in both themes.
Accent selection affects CTA, headings, annotations, output and active path
station; the path highlight is mixed from the chosen accent for dark-surface
contrast. Status and code syntax colours retain their distinct meaning.

Motion is restricted to a 180 ms selected-stage reveal. Reduced motion removes
that animation. No hero uses backdrop-filter, so reduced transparency and
unsupported blur do not change legibility. No raster or graphics dependency
was introduced. Constant glow, decorative file glyphs, empty paper lines and
the first iteration's sparse editorial rules were removed.

The generic-SaaS check passes because the signature elements teach an actual
rule, let the visitor apply it and explain feedback: they cannot describe a
CRM or analytics product without replacing their core content and interaction.
This is a **дизайнерское суждение**, not a HIG mandate.

Revision validation is recorded after deployed browser inspection; earlier
measurements above describe the rejected iteration and must not be treated as
proof for this revision.
