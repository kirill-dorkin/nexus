"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Theme } from "@radix-ui/themes";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { brand } from "@platform/brand";
import { LearningNavigation } from "../../../components/learning/learning-navigation";
import { AppearanceControl } from "../../../components/appearance/appearance-control";
import brandStyles from "../../../components/learning/learning.module.css";
import "@radix-ui/themes/styles.css";
import styles from "./home-lab.module.css";

export function HomeLab({ children }: { children: ReactNode }) {
  return (
    <Theme
      appearance="inherit"
      accentColor="violet"
      radius="large"
      scaling="100%"
      panelBackground="solid"
      hasBackground={false}
      className={styles.theme}
    >
      <div className={styles.page} data-home-preview>
        <a className={styles.skip} href="#home-content">
          Перейти к содержимому
        </a>
        <header className={styles.header}>
          <Link
            href="/"
            className={`${styles.brand} ${brandStyles.brand}`}
            aria-label={`${brand.name} — на главную`}
          >
            <span className={brandStyles.brandMark} aria-hidden="true">
              N
            </span>
            <span className={brandStyles.brandLockup}>
              <span>{brand.name}</span>
              <small>учебная среда</small>
            </span>
          </Link>
          <LearningNavigation />
        </header>
        <div className={styles.previewNotice}>
          <span>Дизайн Preview</span>
          <Link href="/">
            Текущая версия <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <main id="home-content" tabIndex={-1}>
          <section className={styles.hero} aria-labelledby="home-title">
            <h1 id="home-title">Выберите, что изучать.</h1>
            <p>Видео, конспекты и практика — в своём темпе.</p>
          </section>
          {children}
        </main>
        <footer className={styles.footer}>
          <span>{brand.name}</span>
          <nav aria-label="Меню внизу страницы">
            <Link href="/blog">Блог</Link>
            <Link href="/studio">Для авторов</Link>
          </nav>
        </footer>
        <aside
          className={styles.appearanceDock}
          aria-label="Оформление интерфейса"
        >
          <AppearanceControl
            showAccentLabels
            dialogClassName={styles.appearanceDialog ?? ""}
          />
        </aside>
      </div>
    </Theme>
  );
}
