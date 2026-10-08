"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { Dialog, IconButton, buttonClass } from "@platform/ui";
import { AppearanceControl } from "../appearance/appearance-control";
import styles from "./navigation.module.css";

const destinations = [
  { href: "/courses", label: "Курсы" },
  { href: "/me/learning", label: "Моё обучение" },
  { href: "/studio", label: "Studio" }
] as const;

export function LearningNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const id = useId();
  function links() {
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
      <AppearanceControl />
      <Link
        className={`${buttonClass({ variant: "secondary", size: "sm" })} ${styles.login}`}
        href="/login"
        aria-current={pathname === "/login" ? "page" : undefined}
      >
        Войти
      </Link>
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
          <h2 id={`${id}-title`}>Меню</h2>
          <IconButton aria-label="Закрыть меню" onClick={() => setOpen(false)}>
            <X size={22} aria-hidden="true" />
          </IconButton>
        </div>
        <nav aria-label="Главное меню на мобильном экране">
          {links()}
          <Link href="/login" onClick={() => setOpen(false)}>
            Войти
          </Link>
        </nav>
      </Dialog>
    </div>
  );
}
