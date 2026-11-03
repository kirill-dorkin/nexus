"use client";

import { useState } from "react";
import { ArrowRightIcon, BookOpenIcon } from "@phosphor-icons/react/dist/ssr";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Eyebrow,
  Grid,
  Heading,
  IconButton,
  Inline,
  Stack,
  Surface,
  Text
} from "@platform/ui";

export function TokensSection() {
  return (
    <section aria-labelledby="ui-tokens">
      <Stack gap="lg">
        <Heading level={2} id="ui-tokens">
          01 / Визуальные токены
        </Heading>
        <Grid>
          {[
            ["Фон", "--surface-default"],
            ["Панель", "--surface-solid"],
            ["Акцент", "--action-primary"],
            ["Фокус", "--focus-ring"]
          ].map(([label, token]) => (
            <Surface key={token} appearance="solid" padding="sm">
              <div
                className="ui-gallery-swatch"
                style={{ background: `var(${token})` }}
              />
              <Text size="sm">{label}</Text>
              <Text size="sm" muted>
                {token}
              </Text>
            </Surface>
          ))}
        </Grid>
        <Surface>
          <Stack gap="sm">
            <Eyebrow>Типографика</Eyebrow>
            <Heading level={3} size="section">
              От интереса к навыкам.
            </Heading>
            <Text muted>
              Крупный заголовок, спокойный текст и выразительный акцент. Размер
              и семантический уровень заголовка независимы.
            </Text>
            <Inline>
              <Badge>Нейтральный</Badge>
              <Badge tone="accent">Акцент</Badge>
              <Badge tone="success">Успех</Badge>
              <Badge tone="warning">Внимание</Badge>
              <Badge tone="danger">Ошибка</Badge>
            </Inline>
          </Stack>
        </Surface>
      </Stack>
    </section>
  );
}

export function ButtonsSection() {
  const [buttonFeedback, setButtonFeedback] = useState("");
  return (
    <section aria-labelledby="ui-buttons">
      <Stack gap="lg">
        <Heading level={2} id="ui-buttons">
          02 / Действия
        </Heading>
        <Inline>
          <Button onClick={() => setButtonFeedback("Нажата основная кнопка.")}>
            Основная <ArrowRightIcon size={18} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => setButtonFeedback("Нажата вторичная кнопка.")}
          >
            Вторичная
          </Button>
          <Button
            variant="ghost"
            onClick={() => setButtonFeedback("Нажата тихая кнопка.")}
          >
            Тихая
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              setButtonFeedback("Пример опасного действия. Ничего не удалено.")
            }
          >
            Опасное действие
          </Button>
          <IconButton
            aria-label="Показать пример иконки"
            onClick={() =>
              setButtonFeedback("У кнопки с иконкой есть доступное имя.")
            }
          >
            <BookOpenIcon size={20} aria-hidden="true" />
          </IconButton>
        </Inline>
        <Inline>
          <Button
            size="sm"
            onClick={() => setButtonFeedback("Размер: компактный.")}
          >
            Компактная
          </Button>
          <Button
            size="lg"
            onClick={() => setButtonFeedback("Размер: крупный.")}
          >
            Крупная
          </Button>
          <Button disabled>Недоступна</Button>
          <Button loading>Сохранение…</Button>
          <ButtonLink href="/courses" variant="secondary">
            Ссылка в каталог
          </ButtonLink>
        </Inline>
        <Text role="status" size="sm" muted>
          {buttonFeedback || "Нажмите кнопку, чтобы проверить состояние."}
        </Text>
      </Stack>
    </section>
  );
}

export function SurfacesSection() {
  return (
    <section aria-labelledby="ui-surfaces">
      <Stack gap="lg">
        <Heading level={2} id="ui-surfaces">
          03 / Поверхности
        </Heading>
        <Grid>
          {(["glass", "solid", "quiet"] as const).map((appearance) => (
            <Card key={appearance} appearance={appearance}>
              <Stack>
                <Badge>{appearance}</Badge>
                <Heading level={3} size="card">
                  Панель для контента
                </Heading>
                <Text muted size="sm">
                  Одинаковый API, разные уровни визуального акцента. Стекло
                  используется выборочно.
                </Text>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Stack>
    </section>
  );
}
