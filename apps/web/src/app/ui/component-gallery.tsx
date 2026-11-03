"use client";

import { useState } from "react";
import { Button, Inline, Stack, Text } from "@platform/ui";
import "./gallery.css";
import { DialogSection, StatesSection } from "./gallery/feedback";
import { FormsSection } from "./gallery/forms";
import {
  ButtonsSection,
  SurfacesSection,
  TokensSection
} from "./gallery/foundations";
import { CourseListSection, VideoSection } from "./gallery/learning";
import {
  accentChoices,
  type AccentPreference
} from "../../components/appearance/preferences";

export function ComponentGallery() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<AccentPreference>("rose");
  return (
    <div data-ui-theme={theme} data-ui-accent={accent} className="ui-gallery">
      <Inline className="ui-gallery-toolbar">
        <Text size="sm">Тема компонентов</Text>
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={theme === "dark"}
          onClick={() => setTheme("dark")}
        >
          Тёмная
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={theme === "light"}
          onClick={() => setTheme("light")}
        >
          Светлая
        </Button>
      </Inline>
      <Inline className="ui-gallery-toolbar" aria-label="Акцент компонентов">
        <Text size="sm">Цветовой акцент</Text>
        {accentChoices.map((choice) => (
          <Button
            key={choice.value}
            variant="secondary"
            size="sm"
            aria-pressed={accent === choice.value}
            onClick={() => setAccent(choice.value)}
          >
            {choice.label}
          </Button>
        ))}
      </Inline>
      <Stack gap="xl">
        <TokensSection />
        <ButtonsSection />
        <SurfacesSection />
        <FormsSection />
        <StatesSection />
        <DialogSection />
        <CourseListSection />
        <VideoSection />
      </Stack>
    </div>
  );
}
