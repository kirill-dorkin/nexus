export function lessonCount(count: number) {
  const last = count % 10;
  const teen = count % 100 >= 11 && count % 100 <= 14;
  return `${count} ${teen ? "уроков" : last === 1 ? "урок" : last >= 2 && last <= 4 ? "урока" : "уроков"}`;
}
