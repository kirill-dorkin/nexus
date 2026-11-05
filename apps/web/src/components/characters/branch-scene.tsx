import type { CSSProperties } from "react";

import {
  CAST,
  type BranchScene,
  type SceneLine
} from "../../lib/skill-map/story";
import styles from "./characters.module.css";

function Lines({ lines }: { lines: readonly SceneLine[] }) {
  return (
    <ol className={styles.sceneLines}>
      {lines.map(([who, text], i) => (
        <li
          key={i}
          className={styles.sceneLine}
          style={{ "--speaker": CAST[who].color } as CSSProperties}
        >
          <span className={styles.speaker}>{CAST[who].name}</span>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The branch's scene from the season script: the intro (and the fight with Bug, if the branch has
 * one) behind a disclosure, and the outro once every skill of the branch is active. Skippable by
 * design: learning works without it.
 */
export function BranchSceneView({
  scene,
  restored
}: {
  scene: BranchScene | undefined;
  restored: boolean;
}) {
  if (!scene) return null;
  return (
    <div className={styles.scene}>
      <details>
        <summary>{scene.boss ? "Сцена и бой с Багом" : "Сцена"}</summary>
        <Lines lines={scene.intro} />
        {scene.boss && (
          <>
            <p className={styles.sceneLabel}>
              Бой с Багом — финальная работа ветки
            </p>
            <Lines lines={scene.boss} />
          </>
        )}
      </details>
      {restored && (
        <div className={styles.restored}>
          <p className={styles.sceneLabel}>Улица восстановлена</p>
          <Lines lines={scene.outro} />
        </div>
      )}
    </div>
  );
}
