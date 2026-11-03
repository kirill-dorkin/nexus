import { CheckIcon, CircleIcon } from "@phosphor-icons/react/dist/ssr";
import styles from "../challenge.module.css";
import { Inline } from "./inline";
import type { ChallengeCheck } from "./model";

/** The checklist, announced as it changes: each check is done or not yet. */
export function ChecksList({
  checks,
  results
}: {
  checks: readonly ChallengeCheck[];
  results: readonly boolean[];
}) {
  return (
    <ul className={styles.checks} aria-live="polite">
      {checks.map((check, i) => (
        <li key={i} data-ok={results[i] || undefined}>
          {results[i] ? (
            <CheckIcon size={16} weight="bold" aria-hidden="true" />
          ) : (
            <CircleIcon size={16} aria-hidden="true" />
          )}
          <span>
            <Inline text={check.label} />
          </span>
          <span className={styles.srOnly}>
            {results[i] ? " — выполнено" : " — пока нет"}
          </span>
        </li>
      ))}
    </ul>
  );
}
