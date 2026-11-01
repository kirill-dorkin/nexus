export function newFeatures(c) {
  const { html, code, mdn, lesson, single, multi } = c;
  lesson({
    slug: "whats-new", title: "Новинки HTML 2024–2025", minutes: 13,
    summary: "Кнопки-команды commandfor, closedby у диалогов, настраиваемый select, прозрачность в выборе цвета, headingoffset и writingsuggestions.",
    skill: ["html-new-features", "Новые возможности HTML", "Применять новейшие возможности HTML с запасным поведением для браузеров без поддержки."],
    body: [], // текст урока — stories/*.mjs
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
