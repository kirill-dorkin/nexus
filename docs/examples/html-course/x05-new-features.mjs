export function newFeatures(c) {
  const { html, code, mdn, lesson, single, multi } = c;
  lesson({
    slug: "novinki-html", title: "Новинки HTML 2024–2025", minutes: 13,
    summary: "Кнопки-команды commandfor, closedby у диалогов, настраиваемый select, прозрачность в выборе цвета, headingoffset и writingsuggestions.",
    skill: ["html-new-features", "Новые возможности HTML", "Применять новейшие возможности HTML с запасным поведением для браузеров без поддержки."],
    body: [
      `## HTML развивается каждый год`,
      `HTML — «живой стандарт»: новые элементы и атрибуты появляются постоянно. В этом уроке — свежие возможности. Они уже есть в спецификации и в части браузеров. Перед использованием проверяйте поддержку на **caniuse.com** и думайте, что увидит человек в браузере, где поддержки ещё нет.`,
      `## Кнопки-команды: command и commandfor`,
      html(`<button commandfor="info" command="show-modal">Подробнее</button>

<dialog id="info">
  <p>Диалог открыт без единой строки JavaScript.</p>
  <button commandfor="info" command="close">Закрыть</button>
</dialog>

<button commandfor="tip" command="toggle-popover">Подсказка</button>
<div id="tip" popover>Всплывающая подсказка</div>`),
      `\`commandfor\` указывает \`id\` элемента, а \`command\` — что с ним сделать:
- \`show-modal\`, \`close\`, \`request-close\` — для \`dialog\`;
- \`toggle-popover\`, \`show-popover\`, \`hide-popover\` — для \`popover\`;
- своя команда с двумя дефисами, например \`--rotate\`, — её обработает ваш скрипт через событие \`command\`.

Раньше модальный диалог требовал \`showModal()\` в JavaScript, теперь это одна строка разметки. Там, где поддержки нет, кнопка ничего не сделает — подключите запасной скрипт.`,
      `## closedby — как можно закрыть диалог`,
      html(`<dialog open closedby="any">
  <p>Закроется по Escape и по клику мимо окна.</p>
</dialog>`),
      `- \`any\` — Escape и клик вне окна (light dismiss);
- \`closerequest\` — только Escape и системный жест «назад»;
- \`none\` — только явной кнопкой (для важных подтверждений).`,
      `## Настраиваемый select и selectedcontent`,
      html(`<label for="pet">Питомец</label>
<select id="pet" name="pet">
  <button>
    <selectedcontent></selectedcontent>
  </button>
  <option value="cat">🐱 Кошка</option>
  <option value="dog">🐶 Собака</option>
  <option value="parrot">🦜 Попугай</option>
</select>`),
      `Стандартный \`select\` почти не поддаётся оформлению, поэтому годами его заменяли самодельными списками на \`div\` — тяжёлыми и недоступными. Новая модель разрешает класть внутрь \`option\` любую разметку (иконки, описания), а \`selectedcontent\` внутри кнопки повторяет выбранный вариант. Внешний вид включается в CSS свойством \`appearance: base-select\`. В браузерах без поддержки это обычный \`select\` — форма продолжит работать.`,
      `## Прозрачность и цветовое пространство в input color`,
      html(`<label>Цвет с прозрачностью <input type="color" alpha value="#c5f23a"></label>
<label>Широкий цветовой охват <input type="color" colorspace="display-p3"></label>`),
      `\`alpha\` добавляет выбор прозрачности, \`colorspace="display-p3"\` разрешает цвета ярче обычного sRGB на современных экранах. Где поддержки нет, работает обычный выбор цвета.`,
      `## headingoffset и headingreset`,
      code("html", `<article headingoffset="1">
  <h1>Заголовок карточки</h1>  <!-- для читалок станет уровнем 2 -->
</article>
<aside headingreset>
  <h1>Независимый блок</h1>
</aside>`),
      `Новое предложение: \`headingoffset\` сдвигает уровни заголовков внутри элемента, чтобы переиспользуемый компонент с \`h1\` правильно вписывался в иерархию страницы. \`headingreset\` отменяет сдвиг для вложенной части. Это совсем свежая возможность — пока пишите правильные уровни заголовков вручную.`,
      `## writingsuggestions — подсказки при вводе`,
      html(`<label>Пароль от Wi-Fi для гостей <input writingsuggestions="false"></label>
<textarea writingsuggestions="true">Браузер может предлагать продолжение текста.</textarea>`),
      `Браузеры начали предлагать автодополнение текста при вводе. \`writingsuggestions="false"\` выключает подсказки там, где они мешают: коды, пароли, служебные поля.`,
      `## Как относиться к новинкам`,
      `1. Проверьте поддержку на caniuse.com.
2. Убедитесь, что без поддержки страница остаётся рабочей (прогрессивное улучшение).
3. Новинки, которые заменяют JavaScript (commandfor, closedby, popover), уменьшают код и ошибки — их стоит внедрять первыми.`,
      mdn("Element/button#command", "Атрибут command")
    ],
    quizzes: [
      single("new-commandfor", "Модальное окно без скрипта", "Как открыть <dialog id=\"d\"> модально кнопкой без JavaScript?",
        [["command", "<button commandfor=\"d\" command=\"show-modal\">"], ["popover", "<button popovertarget=\"d\">"], ["href", "<a href=\"#d\">"], ["open", "<button open=\"d\">"]], "command",
        "commandfor указывает элемент, command — действие. show-modal открывает диалог модально."),
      single("new-closedby", "Закрытие по клику мимо", "Какое значение closedby разрешает закрыть диалог и Escape, и кликом вне окна?",
        [["any", "any"], ["none", "none"], ["closerequest", "closerequest"], ["outside", "outside"]], "any",
        "any — любой способ закрытия, closerequest — только Escape и жест «назад», none — только явно."),
      multi("new-progressive", "Прогрессивное улучшение", "Что нужно сделать перед использованием новой возможности HTML?",
        [["caniuse", "Проверить поддержку браузерами"], ["fallback", "Убедиться, что без поддержки страница работает"], ["ignore", "Игнорировать старые браузеры полностью"], ["polyfill-all", "Всегда переписывать всё на div и JavaScript"]], ["caniuse", "fallback"],
        "Новинки внедряют как улучшение: страница должна оставаться рабочей и без них.")
    ]
  });
}
