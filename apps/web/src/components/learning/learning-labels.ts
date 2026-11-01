export function lessonCount(count: number) {
  const last = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  return `${count} ${teen ? "уроков" : last === 1 ? "урок" : last >= 2 && last <= 4 ? "урока" : "уроков"}`;
}

/** Human duration: "45 мин", "2 ч", "14 ч 29 мин". */
export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}
