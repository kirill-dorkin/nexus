import type { ReactNode } from "react";
import { Eyebrow, Heading, Stack, Text } from "@platform/ui";
import styles from "./flow.module.css";

export function LearningPageHeading({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.pageHeading}>
      <Stack>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={1} size="display">
          {title}
        </Heading>
        <Text size="lg" muted>
          {description}
        </Text>
        {children}
      </Stack>
    </header>
  );
}
