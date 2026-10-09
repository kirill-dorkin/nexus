import { brand } from "@platform/brand";
import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@platform/ui";
import { LearningNavigation } from "./learning-navigation";
import styles from "./learning.module.css";
export function LearningShell({ children, layout = "page" }: { children: ReactNode; layout?: "page" | "viewport" }) {
  return (
    <Container className={`${styles.shell} ${layout === "viewport" ? styles.viewportShell : ""}`}>
      <a className={styles.skip} href="#learning-main">
        Перейти к содержимому
      </a>
      <header className={styles.nav}>
        <Link className={styles.brand} href="/">
          {brand.name}
        </Link>
        <LearningNavigation />
      </header>
      <main id="learning-main" tabIndex={-1}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div>
          <strong>{brand.name}</strong>
          <span>Учитесь в своём темпе</span>
        </div>
        <nav aria-label="Меню внизу страницы">
          <Link href="/courses">Курсы</Link>
          <Link href="/blog">Блог</Link>
          <Link href="/studio">Для авторов</Link>
        </nav>
      </footer>
    </Container>
  );
}
