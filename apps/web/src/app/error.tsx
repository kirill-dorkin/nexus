"use client";
import { useEffect } from "react";
import { Button, Heading, Stack, Text } from "@platform/ui";
import { LearningShell } from "../components/learning/learning-shell";
import { telemetry } from "../components/telemetry/client-telemetry";
import { clientError } from "../lib/telemetry/errors";
import { routeTemplate } from "../lib/telemetry/route";

export default function PageError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    telemetry.report(
      clientError("render", error, routeTemplate(window.location.pathname))
    );
  }, [error]);
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
