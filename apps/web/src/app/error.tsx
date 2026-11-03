"use client";
import { Button, Heading, Stack, Text } from "@platform/ui";
import { LearningShell } from "../components/learning/learning-shell";
export default function PageError({ reset }: { reset: () => void }) {
  return (
    <LearningShell>
      <Stack
        gap="lg"
        style={{
          maxWidth: "36rem",
          margin: "4rem auto",
          textAlign: "center",
          alignItems: "center"
        }}
      >
        <Heading level={1} size="section">
          Не удалось загрузить страницу
        </Heading>
        <Text muted>Попробуйте ещё раз через минуту.</Text>
        <Button onClick={reset}>Повторить загрузку</Button>
      </Stack>
    </LearningShell>
  );
}
