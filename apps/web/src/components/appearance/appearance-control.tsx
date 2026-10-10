"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Palette, X, Check } from "@phosphor-icons/react/dist/ssr";
import { Dialog, IconButton, Text } from "@platform/ui";
import {
  accentChoices,
  appearanceKey,
  defaultAppearance,
  parseAppearance,
  themeChoices,
  type Appearance
} from "./preferences";
import styles from "./appearance.module.css";

export function AppearanceControl() {
  const [open, setOpen] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  const [saved, setSaved] = useState(true);
  const current = useRef<Appearance>(defaultAppearance);
  const id = useId();
  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (next: Appearance) => {
      current.current = next;
      const root = document.documentElement;
      root.dataset.uiTheme =
        next.theme === "system"
          ? system.matches
            ? "dark"
            : "light"
          : next.theme;
      root.dataset.uiAccent = next.accent;
      root.dataset.themePreference = next.theme;
      setAppearance(next);
    };
    const read = () => {
      try {
        apply(parseAppearance(localStorage.getItem(appearanceKey)));
      } catch {
        apply({ ...defaultAppearance });
      }
    };
    const systemChange = () => {
      if (current.current.theme === "system") apply(current.current);
    };
    const storageChange = (event: StorageEvent) => {
      if (event.key === appearanceKey || event.key === null) read();
    };
    read();
    system.addEventListener("change", systemChange);
    window.addEventListener("storage", storageChange);
    return () => {
      system.removeEventListener("change", systemChange);
      window.removeEventListener("storage", storageChange);
    };
  }, []);
  function choose(next: Appearance) {
    current.current = next;
    setAppearance(next);
    const root = document.documentElement;
    root.dataset.uiTheme =
      next.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : next.theme;
    root.dataset.uiAccent = next.accent;
    root.dataset.themePreference = next.theme;
    try {
      localStorage.setItem(appearanceKey, JSON.stringify(next));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }
  return (
    <>
      <button
        type="button"
        aria-label="Изменить тему и цвет"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
      >
        <Palette size={20} aria-hidden="true" />
        <span>Тема и цвет</span>
        <i
          className={styles.currentAccent}
          data-swatch={appearance.accent}
          aria-hidden="true"
        />
      </button>
      <Dialog
        id={id}
        open={open}
        onDismiss={() => setOpen(false)}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
      >
        <div className={styles.heading}>
          <h2 id={`${id}-title`}>Настройте под себя</h2>
          <IconButton
            aria-label="Закрыть настройки оформления"
            onClick={() => setOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </IconButton>
        </div>
        <fieldset className={styles.choices}>
          <legend>Тема</legend>
          <div className={styles.themes}>
            {themeChoices.map((choice) => (
              <label key={choice.value}>
                <input
                  type="radio"
                  name={`${id}-theme`}
                  value={choice.value}
                  checked={appearance.theme === choice.value}
                  onChange={() =>
                    choose({ ...appearance, theme: choice.value })
                  }
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.choices}>
          <legend>Цветовой акцент</legend>
          <div className={styles.accents}>
            {accentChoices.map((choice) => (
              <label key={choice.value} title={choice.label}>
                <input
                  type="radio"
                  name={`${id}-accent`}
                  aria-label={choice.label}
                  value={choice.value}
                  checked={appearance.accent === choice.value}
                  onChange={() =>
                    choose({ ...appearance, accent: choice.value })
                  }
                />
                <span data-swatch={choice.value}>
                  {appearance.accent === choice.value && (
                    <Check size={19} weight="bold" aria-hidden="true" />
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Text muted size="sm" role="status">
          {saved
            ? "Выбор сохраняется на этом устройстве."
            : "Тема применена. Браузер не разрешил сохранить выбор."}
        </Text>
      </Dialog>
    </>
  );
}
