import type { SkillProgress } from "../../lib/skill-map/skill-map";

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  timeZone: "UTC"
});
export const formatDay = (day: string) =>
  dateFormat.format(new Date(`${day}T00:00:00Z`));

/** One line about where a skill stands, for the skill tree and screen readers. */
export function skillStateText({ state, freshness }: SkillProgress): string {
  switch (state) {
    case "locked":
      return "Закрыт: откроется вместе с веткой";
    case "open":
      return "Открыт: изучите и подтвердите";
    case "confirmed":
      return freshness.dueOn
        ? `Подтверждён, повторить до ${formatDay(freshness.dueOn)}`
        : "Подтверждён";
    case "fading":
      return freshness.forgottenAfter
        ? `Тускнеет: повторите до ${formatDay(freshness.forgottenAfter)}`
        : "Тускнеет: повторите";
    case "forgotten":
      return "Забыт: вспомните, чтобы вернуть в уровень";
  }
}

export const skillActionLabel: Record<SkillProgress["state"], string> = {
  locked: "Изучить",
  open: "Изучить и подтвердить",
  confirmed: "Повторить",
  fading: "Повторить",
  forgotten: "Вспомнить"
};

export const nextActionLabel = {
  repeat: "Повторить",
  recall: "Вспомнить",
  confirm: "Подтвердить"
} as const;

export function skillsWord(n: number) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "навык";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "навыка";
  return "навыков";
}
