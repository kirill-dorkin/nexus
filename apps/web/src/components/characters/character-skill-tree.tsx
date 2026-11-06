import Link from "next/link";

import type {
  BranchProgress,
  Character,
  SkillMapSkill
} from "../../lib/skill-map/skill-map";
import type { BranchScene } from "../../lib/skill-map/story";
import { BranchSceneView } from "./branch-scene";
import {
  skillActionLabel,
  skillStateText,
  skillsWord
} from "./character-labels";
import styles from "./characters.module.css";

export const lessonHref = (skill: SkillMapSkill) =>
  skill.lesson
    ? `/courses/${encodeURIComponent(skill.lesson.course)}/${encodeURIComponent(skill.lesson.slug)}`
    : null;

/** The branch the learner works on now: the first open one that is not complete, else the first. */
export function currentBranchId(
  branches: readonly BranchProgress[]
): string | null {
  const current = branches.find(
    ({ unlocked, active, skills }) => unlocked && active < skills.length
  );
  return (current ?? branches[0])?.branch.id ?? null;
}

function WaitsFor({
  branch,
  character
}: {
  branch: BranchProgress;
  character: Character;
}) {
  if (branch.waitsFor.length === 0) return null;
  return (
    <p className={styles.waitsFor}>
      Откроется после:{" "}
      {branch.waitsFor.map((need, i) => (
        <span key={need.branchId}>
          {i > 0 && ", "}
          <Link
            href={`/characters/${need.characterSlug}#branch-${need.branchId}`}
          >
            {need.characterSlug === character.slug
              ? `ветки «${need.branchTitle}»`
              : `${need.characterName} — ветка «${need.branchTitle}»`}
          </Link>
        </span>
      ))}
    </p>
  );
}

/**
 * The character's skill tree as folding branches: the current branch is open, the others show
 * one summary line (progress, or what a locked branch waits for) until the learner opens them.
 */
export function SkillTree({
  character,
  branches,
  scenes
}: {
  character: Character;
  branches: readonly BranchProgress[];
  scenes: Readonly<Record<string, BranchScene>>;
}) {
  const current = currentBranchId(branches);
  return (
    <section className={styles.branches} aria-labelledby="skill-tree">
      <h2 id="skill-tree" className={styles.sectionTitle}>
        Навыки
      </h2>
      {branches.map((item) => {
        const { branch, unlocked, active, skills } = item;
        const total = skills.length;
        return (
          <details
            key={branch.id}
            id={`branch-${branch.id}`}
            className={styles.branch}
            data-locked={!unlocked || undefined}
            open={branch.id === current}
          >
            <summary className={styles.branchHead}>
              <span className={styles.branchName}>{branch.title}</span>
              <span className={styles.branchMeta}>
                {unlocked
                  ? `${active} из ${total}`
                  : `Закрыта · ${total} ${skillsWord(total)}`}
              </span>
              <progress
                className={styles.branchMeter}
                max={Math.max(total, 1)}
                value={active}
                aria-hidden="true"
              />
            </summary>
            <div className={styles.branchBody}>
              <WaitsFor branch={item} character={character} />
              <BranchSceneView
                scene={scenes[branch.id]}
                restored={active === total && total > 0}
              />
              <ul className={styles.skills}>
                {skills.map((skill) => {
                  const href = lessonHref(skill.skill);
                  return (
                    <li
                      key={skill.skill.key}
                      className={styles.skill}
                      data-state={skill.state}
                    >
                      <span className={styles.dot} aria-hidden="true" />
                      <span className={styles.skillText}>
                        <span className={styles.skillTitle}>
                          {skill.skill.title}
                        </span>
                        {skill.state === "locked" ? (
                          <span className={styles.srOnly}>
                            {skillStateText(skill)}
                          </span>
                        ) : (
                          <span className={styles.skillState}>
                            {skillStateText(skill)}
                          </span>
                        )}
                      </span>
                      {href && (
                        <Link
                          className={styles.skillAction}
                          href={href}
                          aria-label={`${skillActionLabel[skill.state]}: ${skill.skill.title}`}
                        >
                          {skillActionLabel[skill.state]}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
        );
      })}
    </section>
  );
}
