"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ArrowRight, List, X } from "@phosphor-icons/react/dist/ssr";
import { Dialog, IconButton, buttonClass } from "@platform/ui";
import { AppearanceControl } from "../appearance/appearance-control";
import { browserApiRequest } from "../../lib/public-api";
import styles from "./navigation.module.css";

const publicDestinations = [
  { href: "/courses", label: "Курсы" },
  { href: "/blog", label: "Блог" }
] as const;

const privateDestinations = [
  { href: "/me/learning", label: "Моё обучение" },
  { href: "/studio", label: "Studio" }
] as const;

export function LearningNavigation({
  showLogin = true
}: {
  showLogin?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [authState, setAuthState] = useState<
    "checking" | "anonymous" | "authenticated"
  >(showLogin ? "checking" : "authenticated");
  const id = useId();
  useEffect(() => {
    if (!showLogin) return;
    let cancelled = false;
    void browserApiRequest("/v1/me")
      .then((response) => {
        if (!cancelled) {
          setAuthState(response.ok ? "authenticated" : "anonymous");
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState("anonymous");
      });
    return () => { cancelled = true; };
  }, [showLogin]);
  const authenticated = authState === "authenticated";
  function links() {
    const destinations = authenticated
      ? [...publicDestinations, ...privateDestinations]
      : publicDestinations;
    return destinations.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        aria-current={
          pathname === item.href || pathname.startsWith(`${item.href}/`)
            ? "page"
            : undefined
        }
        onClick={() => setOpen(false)}
      >
        {item.label}
      </Link>
    ));
  }
  return (
    <div className={styles.controls}>
      <nav className={styles.desktop} aria-label="Главное меню">
        {links()}
      </nav>
      <div className={styles.utilities}>
        <AppearanceControl />
      </div>
      {showLogin && authState === "anonymous" ? (
        <div className={styles.authActions}>
          <Link className={`${buttonClass({ variant: "ghost", size: "sm" })} ${styles.login}`} href="/login">Войти</Link>
          <Link className={`${buttonClass({ size: "sm" })} ${styles.register}`} href="/login?mode=register">Создать аккаунт</Link>
        </div>
      ) : showLogin && authState === "checking" ? (
        <div className={styles.authPlaceholder} aria-hidden="true">
          <span />
          <span />
        </div>
      ) : null}
      <IconButton
        className={styles.menuButton}
        aria-label="Открыть меню"
        aria-haspopup="dialog"
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <List size={22} aria-hidden="true" />
      </IconButton>
      <Dialog
        open={open}
        id={id}
        onDismiss={() => setOpen(false)}
        className={styles.menu}
        aria-labelledby={`${id}-title`}
      >
        <div className={styles.menuHeading}>
          <div>
            <span className={styles.menuEyebrow}>Nexus</span>
            <h2 id={`${id}-title`}>Куда вы хотите перейти?</h2>
          </div>
          <IconButton aria-label="Закрыть меню" onClick={() => setOpen(false)}>
            <X size={22} aria-hidden="true" />
          </IconButton>
        </div>
        <nav className={styles.mobileNav} aria-label="Главное меню на мобильном экране">
          {links()}
        </nav>
        {showLogin && authState === "anonymous" ? (
          <div className={styles.mobileAuth}>
            <p>Сохраняйте прогресс и продолжайте обучение с любого устройства.</p>
            <Link
              className={buttonClass({ size: "md" })}
              href="/login?mode=register"
              onClick={() => setOpen(false)}
            >
              Создать аккаунт
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/login" onClick={() => setOpen(false)}>Уже есть аккаунт? Войти</Link>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
