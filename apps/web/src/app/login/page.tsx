import Link from "next/link";
import Image from "next/image";
import { brand } from "@platform/brand";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AppearanceControl } from "../../components/appearance/appearance-control";
import styles from "./auth.module.css";
import { safeLearningReturnTo } from "../../lib/learning-return-to";
import { LearningAuth } from "./learning-auth";
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string | string[]; mode?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#auth-main">
        Перейти к содержимому
      </a>
      <div className={styles.art} aria-hidden="true">
        <Image
          src="/images/auth-glass-ribbon.webp"
          alt=""
          width={1254}
          height={1254}
          unoptimized
        />
      </div>
      <header className={styles.header}>
        <nav aria-label="Навигация">
          <Link className={styles.brand} href="/">
            {brand.name}
          </Link>
          <Link className={styles.courses} href="/courses">
            <ArrowLeft size={20} aria-hidden="true" />К курсам
          </Link>
        </nav>
        <AppearanceControl />
      </header>
      <main id="auth-main" tabIndex={-1} className={styles.main}>
        <LearningAuth
          returnTo={safeLearningReturnTo(query.returnTo)}
          initialMode={query.mode === "register" ? "register" : "login"}
        />
      </main>
    </div>
  );
}
