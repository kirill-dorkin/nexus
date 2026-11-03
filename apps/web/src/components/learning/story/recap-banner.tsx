import { type CSSProperties } from "react";
import styles from "../story.module.css";
import { CAST, CHARACTERS, type Recap } from "./model";
import { Avatar, Rich } from "./rich";

/** Top-of-lesson story context, so a learner who lands mid-course knows who is who and where we are. */
export function RecapBanner({ recap }: { recap: Recap }) {
  return (
    <aside className={styles.recap} aria-label="Контекст урока">
      <div className={styles.recapTop}>
        <span className={styles.cast} aria-hidden="true">
          {(recap.cast ?? CAST).map((who) => (
            <Avatar key={who} who={who} />
          ))}
        </span>
        {recap.premise && <p className={styles.premise}>{recap.premise}</p>}
      </div>
      <p className={styles.now}>
        <span>Сейчас</span> <Rich text={recap.now} />
      </p>
      <details className={styles.who}>
        <summary>Кто есть кто</summary>
        <ul>
          {(recap.cast ?? CAST)
            .filter((w) => w !== "you")
            .map((who) => (
              <li
                key={who}
                style={{ "--c": CHARACTERS[who].color } as CSSProperties}
              >
                <Avatar who={who} />
                <span>
                  <strong>{CHARACTERS[who].name}</strong> —{" "}
                  {CHARACTERS[who].role}
                </span>
              </li>
            ))}
        </ul>
        <p>Каждый урок самостоятельный: всё нужное объясняется прямо в нём.</p>
      </details>
    </aside>
  );
}
