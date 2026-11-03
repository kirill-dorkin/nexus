"use client";

import { useState } from "react";
import { BookOpenIcon } from "@phosphor-icons/react/dist/ssr";
import {
  Alert,
  Button,
  ButtonLink,
  CodeBlock,
  Disclosure,
  Dialog,
  Divider,
  EmptyState,
  Field,
  Grid,
  Heading,
  Input,
  Progress,
  Skeleton,
  Stack,
  Surface,
  Text
} from "@platform/ui";

export function StatesSection() {
  return (
    <section aria-labelledby="ui-states">
      <Stack gap="lg">
        <Heading level={2} id="ui-states">
          05 / Обратная связь
        </Heading>
        <Grid>
          <Alert tone="success" title="Всё получилось">
            Пример успешного результата.
          </Alert>
          <Alert tone="warning" title="Нужно проверить">
            Пример сообщения, требующего внимания.
          </Alert>
          <Alert tone="danger" title="Не удалось сохранить">
            Пример ошибки с понятным объяснением.
          </Alert>
        </Grid>
        <Surface>
          <Stack gap="lg">
            <Progress value={60} label="Пример прогресса" />
            <Progress label="Пример неопределённого прогресса" />
            <Divider />
            <div aria-busy="true" aria-label="Пример загрузки">
              <Stack gap="sm">
                <Skeleton />
                <Skeleton className="ui-gallery-skeleton-short" />
              </Stack>
            </div>
          </Stack>
        </Surface>
        <Surface padding="none">
          <EmptyState
            title="Пока ничего нет"
            icon={<BookOpenIcon size={28} />}
            action={
              <ButtonLink href="/courses" variant="secondary">
                Открыть каталог
              </ButtonLink>
            }
          >
            Пустое состояние объясняет, что произойдёт дальше.
          </EmptyState>
        </Surface>
        <Disclosure summary="Нативный раскрывающийся блок">
          Работает с клавиатуры и без JavaScript. Семантика details/summary
          остаётся нативной.
        </Disclosure>
        <CodeBlock>
          {
            'import { Button, Surface } from "@platform/ui";\n\n<Surface appearance="glass">\n  <Button type="submit">Сохранить</Button>\n</Surface>'
          }
        </CodeBlock>
      </Stack>
    </section>
  );
}

export function DialogSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <section aria-labelledby="ui-dialog">
      <Stack gap="lg">
        <Heading level={2} id="ui-dialog">
          06 / Диалог
        </Heading>
        <Text muted>
          Нативный диалог удерживает фокус, закрывается по Escape и возвращает
          фокус на кнопку. На узком экране содержимое остаётся доступным.
        </Text>
        <Button
          variant="secondary"
          aria-haspopup="dialog"
          aria-expanded={dialogOpen}
          aria-controls="ui-dialog-example"
          onClick={() => setDialogOpen(true)}
        >
          Открыть пример диалога
        </Button>
        <Dialog
          id="ui-dialog-example"
          open={dialogOpen}
          onDismiss={() => setDialogOpen(false)}
          aria-labelledby="ui-dialog-example-title"
        >
          <Stack gap="lg">
            <Heading level={3} size="card" id="ui-dialog-example-title">
              Пример диалога
            </Heading>
            <Text muted>Это демонстрация. Данные никуда не отправляются.</Text>
            <Field htmlFor="dialog-example-name" label="Проверка фокуса">
              <Input
                id="dialog-example-name"
                placeholder="Попробуйте Tab и Escape"
              />
            </Field>
            <Button onClick={() => setDialogOpen(false)}>Закрыть пример</Button>
          </Stack>
        </Dialog>
      </Stack>
    </section>
  );
}
