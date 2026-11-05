import type { AssignmentCheckResult } from "@platform/contracts";
import { Text } from "@platform/ui";

import styles from "../flow.module.css";

/** The server's answer to one try: every check with ✓ or ✗ and the author's hint. */
export function AssignmentReport({
  result
}: {
  result: AssignmentCheckResult;
}) {
  const passed = result.checks.filter((check) => check.passed).length;
  return (
    <section
      aria-label="Результат проверки"
      className={styles.assignmentReport}
    >
      <strong>
        {result.outcome === "passed"
          ? "Задание выполнено"
          : `Пройдено проверок: ${passed} из ${result.checks.length}`}
      </strong>
      <ul>
        {result.checks.map((check) => (
          <li key={check.label} data-passed={check.passed}>
            <span aria-hidden="true">{check.passed ? "✓" : "✗"}</span>{" "}
            <span className={styles.visuallyHidden}>
              {check.passed ? "Пройдено: " : "Не пройдено: "}
            </span>
            {check.label}
            {!check.passed && check.hint && (
              <Text muted size="sm">
                {check.hint}
              </Text>
            )}
          </li>
        ))}
      </ul>
      <Text muted size="sm">
        Попытка {result.attemptNumber}. Результат сохранён.
      </Text>
    </section>
  );
}
