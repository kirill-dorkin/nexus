"use client";

import { SoundPanel } from "./sound-panel";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CaretRightIcon,
  HouseIcon,
  ListIcon,
  NotebookIcon,
  UserCircleIcon,
  UsersThreeIcon,
  XIcon
} from "@phosphor-icons/react/dist/ssr";
import { Dialog, IconButton, buttonClass } from "@platform/ui";
import { brand } from "@platform/brand";
import { browserApiRequest } from "../../lib/public-api";
import styles from "./navigation.module.css";

const publicDestinations = [
  { href: "/courses", label: "Курсы" },
  { href: "/characters", label: "Персонажи" },
  { href: "/blog", label: "Блог" }
] as const;

// Studio is for authors only and stays at its direct address (/studio); learners never need it
// in the menu (owner, 2026-11-06).
const privateDestinations = [
  { href: "/me/learning", label: "Моё обучение" }
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
    return () => {
      cancelled = true;
    };
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
      <SoundPanel compact />
      {showLogin && authState === "anonymous" ? (
        <div className={styles.authActions}>
          <Link
            className={`${buttonClass({ variant: "ghost", size: "sm" })} ${styles.login}`}
            href="/login"
          >
            Войти
          </Link>
          <Link
            className={`${buttonClass({ size: "sm" })} ${styles.register}`}
            href="/login?mode=register"
          >
            Начать бесплатно
          </Link>
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
        <ListIcon size={22} aria-hidden="true" />
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
            <span className={styles.menuEyebrow}>{brand.name}</span>
            <h2 id={`${id}-title`}>Куда отправимся?</h2>
          </div>
          <IconButton
            aria-label="Закрыть меню"
            onClick={closeMenu}
            className={styles.closeButton}
          >
            <XIcon size={22} aria-hidden="true" />
          </IconButton>
        </div>
        <div className={styles.menuContent}>
          <nav
            className={styles.mobileNav}
            aria-label="Главное меню на мобильном экране"
          >
            <span className={styles.groupLabel}>ОБУЧЕНИЕ</span>
            <Link
              href="/"
              aria-current={pathname === "/" ? "page" : undefined}
              onClick={closeMenu}
            >
              <HouseIcon size={21} aria-hidden="true" />
              <span>Главная</span>
              <CaretRightIcon size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/courses"
              aria-current={pathname === "/courses" ? "page" : undefined}
              onClick={closeMenu}
            >
              <BookOpenIcon size={21} aria-hidden="true" />
              <span>Все курсы</span>
              <CaretRightIcon size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/characters"
              aria-current={
                pathname === "/characters" ||
                pathname.startsWith("/characters/")
                  ? "page"
                  : undefined
              }
              onClick={closeMenu}
            >
              <UsersThreeIcon size={21} aria-hidden="true" />
              <span>Персонажи</span>
              <CaretRightIcon size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/blog"
              aria-current={
                pathname === "/blog" || pathname.startsWith("/blog/")
                  ? "page"
                  : undefined
              }
              onClick={closeMenu}
            >
              <NotebookIcon size={21} aria-hidden="true" />
              <span>Блог</span>
              <CaretRightIcon size={18} aria-hidden="true" />
            </Link>
            {authenticated && (
              <>
                <span className={styles.groupLabel}>ЛИЧНОЕ</span>
                {privateDestinations.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)
                        ? "page"
                        : undefined
                    }
                    onClick={closeMenu}
                  >
                    <UserCircleIcon size={21} aria-hidden="true" />
                    <span>{item.label}</span>
                    <CaretRightIcon size={18} aria-hidden="true" />
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
        <div className={styles.menuFooter}>
          {showLogin && authState === "anonymous" ? (
            <div className={styles.mobileAuth}>
              <Link
                className={buttonClass({ size: "md" })}
                href="/login?mode=register"
                onClick={closeMenu}
              >
                Начать бесплатно <ArrowRightIcon size={19} aria-hidden="true" />
              </Link>
              <Link
                className={buttonClass({ variant: "secondary", size: "md" })}
                href="/login"
                onClick={closeMenu}
              >
                Уже есть аккаунт? Войти
              </Link>
            </div>
          ) : showLogin && authState === "checking" ? (
            <span className={styles.menuStatus} role="status">
              Проверяем вход…
            </span>
          ) : (
            <p className={styles.menuStatus}>Учитесь в своём темпе.</p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
