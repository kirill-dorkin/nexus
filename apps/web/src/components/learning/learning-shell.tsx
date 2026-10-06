import { brand } from "@platform/brand";
import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./learning.module.css";
export function LearningShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#learning-main">
        Перейти к содержимому
      </a>
      <header className={styles.nav}>
        <Link className={styles.brand} href="/">
          {brand.name}
        </Link>
        <nav aria-label="Главное меню">
          <Link href="/courses">Курсы</Link>
          <Link href="/me/learning">Моё обучение</Link>
          <Link href="/login">Войти</Link>
        </nav>
      </header>
      <main id="learning-main" tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>
        {brand.name} · Учитесь в своём темпе
      </footer>
    </div>
  );
}
