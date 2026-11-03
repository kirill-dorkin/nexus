import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { BrandLink } from "../../components/learning/learning-shell";
import styles from "./auth.module.css";
import { safeLearningReturnTo } from "../../lib/learning-return-to";
import { LearningAuth } from "./learning-auth";
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{
    returnTo?: string | string[];
    mode?: string | string[];
    oauthError?: string | string[];
  }>;
}) {
  const query = await searchParams;
  return (
    <div
      className={styles.page}
      data-learner-scope=""
      data-ui-theme="dark"
      data-ui-accent="lime"
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
        <LearningAuth
          returnTo={safeLearningReturnTo(query.returnTo)}
          initialMode={query.mode === "register" ? "register" : "login"}
          externalLoginFailed={query.oauthError === "external_login_failed"}
        />
      </main>
    </div>
  );
}
