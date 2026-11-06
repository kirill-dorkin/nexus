import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { BrandLink } from "../../components/learning/learning-shell";
import styles from "./auth.module.css";

/** The dark frame of the sign-in, registration and password reset pages. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={styles.page}
      data-learner-scope=""
      data-ui-theme="dark"
      data-ui-accent="ember"
    >
      <a className={styles.skip} href="#auth-main">
        Перейти к содержимому
      </a>
      <header className={styles.header}>
        <nav aria-label="Навигация">
          <BrandLink />
          <Link className={styles.courses} href="/courses">
            <ArrowLeftIcon size={18} aria-hidden="true" />К курсам
          </Link>
        </nav>
      </header>
      <main id="auth-main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
  );
}
