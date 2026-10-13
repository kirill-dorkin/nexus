export const appearanceKey = "platform.appearance.v1";
export const themeChoices = [
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
  { value: "system", label: "Системная" }
] as const;
export const accentChoices = [
  { value: "rose", label: "Розовый" },
  { value: "violet", label: "Фиолетовый" },
  { value: "blue", label: "Синий" },
  { value: "teal", label: "Бирюзовый" },
  { value: "amber", label: "Янтарный" }
] as const;
export type ThemePreference = (typeof themeChoices)[number]["value"];
export type AccentPreference = (typeof accentChoices)[number]["value"];
export type Appearance = { theme: ThemePreference; accent: AccentPreference };
export const defaultAppearance: Appearance = {
  theme: "system",
  accent: "rose"
};

export function parseAppearance(raw: string | null): Appearance {
  try {
    const parsed: unknown = JSON.parse(raw ?? "null");
    if (parsed && typeof parsed === "object") {
      const value = parsed as Record<string, unknown>;
      return {
        theme: themeChoices.some((choice) => choice.value === value.theme)
          ? (value.theme as ThemePreference)
          : defaultAppearance.theme,
        accent: accentChoices.some((choice) => choice.value === value.accent)
          ? (value.accent as AccentPreference)
          : defaultAppearance.accent
      };
    }
  } catch {
    /* A corrupt or unavailable preference never blocks the app. */
  }
  return { ...defaultAppearance };
}

// Runs before first paint; all embedded values are repository-owned literals.
// The root attributes are the only hydration differences (see RootLayout).
export const appearanceBootScript = `(()=>{let p=${JSON.stringify(defaultAppearance)};try{const v=JSON.parse(localStorage.getItem(${JSON.stringify(appearanceKey)})||'null');if(v&&typeof v==='object'){if(${JSON.stringify(themeChoices.map((c) => c.value))}.includes(v.theme))p.theme=v.theme;if(${JSON.stringify(accentChoices.map((c) => c.value))}.includes(v.accent))p.accent=v.accent;}}catch{}const r=document.documentElement;r.dataset.uiTheme=p.theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p.theme;r.dataset.uiAccent=p.accent;r.dataset.themePreference=p.theme;})();`;
