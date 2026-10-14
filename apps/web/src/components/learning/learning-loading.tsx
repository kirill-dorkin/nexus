import { Skeleton, Text } from "@platform/ui";
import styles from "./flow.module.css";

export function LearningLoading({ children }: { children: string }) {
  return (
    <div className={styles.loading} aria-busy="true">
      <Text size="sm" muted role="status">
        {children}
      </Text>
      <Skeleton />
      <Skeleton />
    </div>
  );
}
