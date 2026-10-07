import { brand } from "@platform/brand";
import type { ReactNode } from "react";
import Link from "next/link";
import { Container, buttonClass } from "@platform/ui";
import styles from "./learning.module.css";
export function LearningShell({ children }: { children: ReactNode }) {
  return (
    <Container className={styles.shell}>
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
          <Link href="/studio">Studio</Link>
          <Link
            className={buttonClass({ variant: "secondary", size: "sm" })}
            href="/login"
          >
            Войти
          </Link>
        </nav>
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
          <Link href="/me/learning">Моё обучение</Link>
          <Link href="/studio">Для авторов</Link>
        </nav>
      </footer>
    </Container>
  );
}
