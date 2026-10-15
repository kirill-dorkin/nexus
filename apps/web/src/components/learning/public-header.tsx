import { brand } from "@platform/brand";
import Link from "next/link";
import { AppearanceControl } from "../appearance/appearance-control";
import { LearningNavigation } from "./learning-navigation";
import styles from "./learning.module.css";

/**
 * Shared public/learner navigation for the home, catalogue, course, lesson and
 * editorial surfaces. Access to staff workspaces is intentionally NOT inferred
 * from authentication or Organization membership.
 */
export function PublicHeader({ className = "" }: { className?: string }) {
  return (
    <header className={`${styles.nav} ${className}`.trim()}>
      <Link className={styles.brand} href="/" aria-label={`${brand.name} — на главную`}>
        <span className={styles.brandMark} aria-hidden="true">N</span>
        <span className={styles.brandLockup}>
          <span>{brand.name}</span>
          <small>учебная среда</small>
        </span>
      </Link>
      <div className={styles.headerActions}>
        <LearningNavigation />
        <AppearanceControl compact />
      </div>
    </header>
  );
}
