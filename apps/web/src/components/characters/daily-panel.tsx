import Link from "next/link";

import {
  dailyQuests,
  playerLevel,
  streak,
  type DailyQuest
} from "../../lib/skill-map/daily";
import type { RecordsByKey } from "../../lib/skill-map/skill-map";
import styles from "./characters.module.css";

const questVerb: Record<DailyQuest["kind"], string> = {
  repeat: "Повторить",
  recall: "Вспомнить",
  confirm: "Подтвердить"
};

function daysWord(n: number) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

/** «Сегодня»: player level and title, the streak and up to three quests. */
export function DailyPanel({
  records,
  today
}: {
  records: RecordsByKey;
  today: string;
}) {
  const player = playerLevel(records, today);
  const days = streak(records, today);
  const quests = dailyQuests(records, today);
  return (
    <section className={styles.daily} aria-labelledby="daily-title">
      <div className={styles.dailyHead}>
        <h2 id="daily-title" className={styles.name}>
          Сегодня
        </h2>
        <p className={styles.summary}>
          {player.title} · уровень игрока {player.level}
          {days > 0 && ` · серия ${days} ${daysWord(days)}`}
        </p>
      </div>
      {quests.length > 0 && (
        <ol className={styles.quests}>
          {quests.map((quest) => (
            <li
              key={quest.skill.key}
              className={styles.quest}
              data-done={quest.done || undefined}
              data-ui-accent={quest.character.accent}
            >
              <span className={styles.questMark} aria-hidden="true">
                {quest.done ? "✓" : ""}
              </span>
              <span className={styles.skillText}>
                <span className={styles.skillTitle}>
                  {questVerb[quest.kind]}: {quest.skill.title}
                </span>
                <span className={styles.skillState}>
                  {quest.character.name}
                  {quest.done ? " · выполнено" : ""}
                </span>
              </span>
              {quest.skill.lesson && !quest.done && (
                <Link
                  className={styles.skillAction}
                  href={`/courses/${encodeURIComponent(quest.skill.lesson.course)}/${encodeURIComponent(quest.skill.lesson.slug)}`}
                  aria-label={`К уроку: ${quest.skill.title}`}
                >
                  К уроку
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
