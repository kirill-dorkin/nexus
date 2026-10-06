import type { ReactNode } from "react";
import Link from "next/link";
import { brand } from "@platform/brand";
import styles from "./studio.module.css";
export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a href="#studio-main">Перейти к содержимому</a>
      <header className={styles.nav}>
        <Link href="/">{brand.name}</Link>
        <nav className={styles.actions} aria-label="Studio">
          <Link href="/studio">Studio</Link>
          <Link href="/courses">Курсы</Link>
          <Link href="/me/learning">Моё обучение</Link>
        </nav>
      </header>
      <main id="studio-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
