import type { ReactNode } from "react";
import Link from "next/link";
import { brand } from "@platform/brand";
import { Container } from "@platform/ui";
import { AppearanceControl } from "../appearance/appearance-control";
import { LearningNavigation } from "../learning/learning-navigation";
import layout from "../learning/learning.module.css";
import styles from "./studio.module.css";
export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <Container className={`${layout.shell} ${styles.shell}`}>
      <a className={layout.skip} href="#studio-main">
        Перейти к содержимому
      </a>
      <header className={layout.nav}>
        <Link className={layout.brand} href="/" aria-label={`${brand.name} — на главную`}>
          <span className={layout.brandMark} aria-hidden="true">N</span>
          <span className={layout.brandLockup}>
            <span>{brand.name}</span>
            <small>Studio</small>
          </span>
        </Link>
        <LearningNavigation showLogin={false} />
      </header>
      <AppearanceControl />
      <main id="studio-main" tabIndex={-1}>
        {children}
      </main>
      <footer className={layout.footer}>
        <div>
          <strong>Studio</strong>
          <span>От замысла к готовому курсу</span>
        </div>
        <nav aria-label="Меню внизу Studio">
          <Link href="/studio">Все курсы</Link>
          <Link href="/courses">Каталог для учеников</Link>
        </nav>
      </footer>
    </Container>
  );
}
