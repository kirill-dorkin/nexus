"use client";
import { Button, Container, Stack, Surface, Text, Heading } from "@platform/ui";
export default function PageError({ reset }: { reset: () => void }) {
  return (
    <main>
      <Container>
        <Surface padding="lg">
          <Stack gap="lg">
            <Heading level={1}>Не удалось загрузить страницу</Heading>
            <Text muted>Попробуйте ещё раз через минуту.</Text>
            <div>
              <Button onClick={reset}>Повторить загрузку</Button>
            </div>
          </Stack>
        </Surface>
      </Container>
    </main>
  );
}
