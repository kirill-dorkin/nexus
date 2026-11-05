import { brand } from "@platform/brand";
import type { ReactNode } from "react";
import Link from "next/link";
import { LearningNavigation } from "./learning-navigation";
import styles from "./site.module.css";

/** Brand glyph: two connected nodes, drawn in the accent colour. */
export function BrandMark() {
  return (
    <span className={styles.mark} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <circle cx="7" cy="7" r="3.2" fill="currentColor" />
        <circle cx="17" cy="17" r="3.2" fill="currentColor" />
        <path
          d="M9.3 9.3 14.7 14.7"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function BrandLink() {
  return (
    <Link
      className={styles.brand}
      href="/"
      aria-label={`${brand.name} — на главную`}
    >
      <BrandMark />
      <span>{brand.name}</span>
    </Link>
  );
}

/** Shared dark frame for every learner-facing page. */
export function LearningShell({
  children,
  width = "default"
}: {
  children: ReactNode;
  width?: "default" | "full";
}) {
  return (
    <div
      className={styles.scope}
      data-learner-scope=""
      data-ui-theme="dark"
      data-ui-accent="lime"
    >
      <a className={styles.skip} href="#learning-main">
        Перейти к содержимому
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <BrandLink />
          <LearningNavigation />
        </div>
      </header>
      <main
        id="learning-main"
        tabIndex={-1}
        className={width === "full" ? styles.mainFull : styles.main}
      >
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <BrandLink />
            <p>Бесплатные IT-курсы: видео, конспект и задания с проверкой.</p>
          </div>
          <nav aria-label="Меню внизу страницы" className={styles.footerNav}>
            <div>
              <span>Обучение</span>
              <Link href="/courses">Курсы</Link>
              <Link href="/me/learning">Моё обучение</Link>
            </div>
            <div>
              <span>Проект</span>
              <Link href="/blog">Блог</Link>
              <Link href="/studio">Для авторов</Link>
            </div>
            <div>
              <span>Документы</span>
              <Link href="/privacy">Политика конфиденциальности</Link>
              <Link href="/consent">Согласие на обработку данных</Link>
              <Link href="/terms">Пользовательское соглашение</Link>
            </div>
          </nav>
        </div>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} {brand.name}
        </p>
      </footer>
    </div>
  );
}
