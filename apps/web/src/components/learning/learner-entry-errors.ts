/** What the learner reads when «Начать курс» or entry fails with this HTTP status. */
export function entryCommandError(status: number): string {
  return status === 409 || status === 403 || status === 404
    ? "Доступ изменился. Обновите состояние обучения или обратитесь в организацию."
    : "Не удалось выполнить действие. Можно безопасно повторить его.";
}
