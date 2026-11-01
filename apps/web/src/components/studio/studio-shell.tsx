import type { ReactNode } from "react";
import Link from "next/link";
import { brand } from "@platform/brand";
import { BrandMark } from "../learning/learning-shell";
import { LearningNavigation } from "../learning/learning-navigation";
import site from "../learning/site.module.css";
import styles from "./studio.module.css";

/** Studio uses the same dark frame as learner pages, marked as the author area. */
export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${site.scope} ${styles.shell}`}
      data-learner-scope=""
      data-ui-theme="dark"
      data-ui-accent="lime"
    >
      <a className={site.skip} href="#studio-main">
        Перейти к содержимому
      </a>
      <header className={site.header}>
        <div className={site.headerInner}>
          <Link className={site.brand} href="/" aria-label={`${brand.name} — на главную`}>
            <BrandMark />
            <span>{brand.name}</span>
            <span className={styles.areaBadge}>Studio</span>
          </Link>
          <LearningNavigation showLogin={false} />
        </div>
      </header>
      <main id="studio-main" tabIndex={-1} className={site.main}>
        {children}
      </main>
      <footer className={site.footer}>
        <div className={site.footerInner}>
          <div className={site.footerBrand}>
            <strong>Studio</strong>
            <p>От замысла к готовому курсу.</p>
          </div>
          <nav aria-label="Меню внизу Studio" className={site.footerNav}>
            <div>
              <span>Studio</span>
              <Link href="/studio">Все курсы</Link>
              <Link href="/courses">Каталог для учеников</Link>
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
