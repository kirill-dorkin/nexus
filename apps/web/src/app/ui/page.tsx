import type { Metadata } from "next";
import { LearningShell } from "../../components/learning/learning-shell";
import { Eyebrow, Heading, Stack, Text } from "@platform/ui";
import { ComponentGallery } from "./component-gallery";

export const metadata: Metadata = {
  title: "UI библиотека",
  robots: { index: false, follow: false }
};
export default function UiPage() {
  return (
    <LearningShell>
      <Stack gap="sm" className="ui-gallery-heading">
        <Eyebrow>Дизайн-система / версия 1</Eyebrow>
        <Heading level={1}>Одно визуальное пространство.</Heading>
        <Text muted>
          Живые примеры переиспользуемых компонентов. Это демонстрация
          интерфейса, а не данные обучения.
        </Text>
      </Stack>
      <ComponentGallery />
    </LearningShell>
  );
}
