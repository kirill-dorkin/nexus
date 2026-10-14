"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ArrowRight, BookOpen, CaretRight, House, List, Notebook, UserCircle, X } from "@phosphor-icons/react/dist/ssr";
import { Dialog, IconButton, buttonClass } from "@platform/ui";
import { brand } from "@platform/brand";
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
  const closeMenu = () => setOpen(false);
  return (
    <div className={styles.controls}>
      <nav className={styles.desktop} aria-label="Главное меню">
        {links()}
      </nav>
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
          <div className={styles.menuIdentity}>
            <span className={styles.menuEyebrow}>{brand.name} / НАВИГАЦИЯ</span>
            <h2 id={`${id}-title`}>Куда отправимся?</h2>
          </div>
          <IconButton aria-label="Закрыть меню" onClick={closeMenu} className={styles.closeButton}>
            <X size={22} aria-hidden="true" />
          </IconButton>
        </div>
        <div className={styles.menuContent}>
          <nav className={styles.mobileNav} aria-label="Главное меню на мобильном экране">
            <span className={styles.groupLabel}>ОБУЧЕНИЕ</span>
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined} onClick={closeMenu}>
              <House size={21} aria-hidden="true" />
              <span>Главная</span>
              <CaretRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/courses" aria-current={pathname === "/courses" ? "page" : undefined} onClick={closeMenu}>
              <BookOpen size={21} aria-hidden="true" />
              <span>Все курсы</span>
              <CaretRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/blog" aria-current={pathname === "/blog" || pathname.startsWith("/blog/") ? "page" : undefined} onClick={closeMenu}>
              <Notebook size={21} aria-hidden="true" />
              <span>Блог</span>
              <CaretRight size={18} aria-hidden="true" />
            </Link>
            {authenticated && (
              <>
                <span className={styles.groupLabel}>ЛИЧНОЕ</span>
                {privateDestinations.map((item) => (
                  <Link key={item.href} href={item.href}
                    aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
                    onClick={closeMenu}>
                    <UserCircle size={21} aria-hidden="true" />
                    <span>{item.label}</span>
                    <CaretRight size={18} aria-hidden="true" />
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
        <div className={styles.menuFooter}>
          {showLogin && authState === "anonymous" ? (
            <div className={styles.mobileAuth}>
              <Link className={buttonClass({ size: "md" })} href="/login?mode=register" onClick={closeMenu}>
                Создать аккаунт <ArrowRight size={19} aria-hidden="true" />
              </Link>
              <Link className={buttonClass({ variant: "secondary", size: "md" })} href="/login" onClick={closeMenu}>
                Уже есть аккаунт? Войти
              </Link>
            </div>
          ) : showLogin && authState === "checking" ? (
            <span className={styles.menuStatus} role="status">Проверяем вход…</span>
          ) : (
            <p className={styles.menuStatus}>Учитесь в своём темпе.</p>
          )}
        </div>
      </Dialog>
    </div>
  );
}

