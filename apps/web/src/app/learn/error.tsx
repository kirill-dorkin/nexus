"use client";
import Link from "next/link";
import { Button, Heading, Stack, Surface, Text } from "@platform/ui";
import { LearningShell } from "../../components/learning/learning-shell";
export default function LearningError({ reset }: { reset: () => void }) {
  return (
    <LearningShell>
      <Surface
        appearance="solid"
        style={{ maxWidth: "44rem", margin: "3rem auto" }}
      >
        <Stack gap="lg">
          <Heading level={1} size="section">
            Не удалось загрузить обучение
          </Heading>
          <Text muted>
            Материалы сейчас недоступны. Попробуйте ещё раз чуть позже.
          </Text>
          <Button onClick={reset}>Повторить загрузку</Button>
          <Link href="/courses">Вернуться к курсам</Link>
        </Stack>
      </Surface>
    </LearningShell>
  );
}
