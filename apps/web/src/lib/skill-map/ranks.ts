/** The site's ranks, by character level (0–100). */
export const RANKS = [
  { from: 0, title: "Новичок" },
  { from: 20, title: "Ученик" },
  { from: 40, title: "Практик" },
  { from: 60, title: "Мастер" },
  { from: 80, title: "Эксперт" },
  { from: 95, title: "Легенда" }
] as const;

export function rankOf(level: number): string {
  let title: string = RANKS[0].title;
  for (const rank of RANKS) if (level >= rank.from) title = rank.title;
  return title;
}
