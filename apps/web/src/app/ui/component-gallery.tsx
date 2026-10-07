"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, BookOpen } from "@phosphor-icons/react/dist/ssr";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  CodeBlock,
  Disclosure,
  Divider,
  EmptyState,
  Eyebrow,
  Field,
  Grid,
  Heading,
  IconButton,
  Inline,
  Input,
  Progress,
  RadioGroup,
  Select,
  Skeleton,
  Stack,
  Surface,
  Text,
  Textarea
} from "@platform/ui";
import "./gallery.css";

export function ComponentGallery() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [buttonFeedback, setButtonFeedback] = useState("");
  const [formFeedback, setFormFeedback] = useState("");
  function submitExample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormFeedback(
      "Форма прошла проверку. Это пример: данные никуда не отправлены."
    );
  }
  return (
    <div data-ui-theme={theme} className="ui-gallery">
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
      <Stack gap="xl">
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
                  Крупный заголовок, спокойный текст и выразительный акцент.
                  Размер и семантический уровень заголовка независимы.
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
        <section aria-labelledby="ui-buttons">
          <Stack gap="lg">
            <Heading level={2} id="ui-buttons">
              02 / Действия
            </Heading>
            <Inline>
              <Button
                onClick={() => setButtonFeedback("Нажата основная кнопка.")}
              >
                Основная <ArrowRight size={18} aria-hidden="true" />
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
                  setButtonFeedback(
                    "Пример опасного действия. Ничего не удалено."
                  )
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
                <BookOpen size={20} aria-hidden="true" />
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
        <section aria-labelledby="ui-forms">
          <Stack gap="lg">
            <Heading level={2} id="ui-forms">
              04 / Поля и выбор
            </Heading>
            <Surface appearance="solid">
              <form
                onSubmit={submitExample}
                onReset={() => setFormFeedback("")}
              >
                <Stack gap="lg">
                  <Text muted size="sm">
                    Демонстрационная форма. Данные никуда не отправляются.
                  </Text>
                  <Grid>
                    <Field
                      htmlFor="example-name"
                      label="Имя"
                      hint="Обязательное поле"
                    >
                      <Input
                        id="example-name"
                        name="name"
                        required
                        autoComplete="off"
                        placeholder="Как к вам обращаться"
                        aria-describedby="example-name-hint"
                      />
                    </Field>
                    <Field htmlFor="example-format" label="Формат">
                      <Select
                        id="example-format"
                        name="format"
                        defaultValue="self-paced"
                      >
                        <option value="self-paced">В своём темпе</option>
                        <option value="guided">С поддержкой</option>
                      </Select>
                    </Field>
                  </Grid>
                  <Field
                    htmlFor="example-notes"
                    label="Заметки"
                    hint="Поле растягивается по высоте"
                  >
                    <Textarea
                      id="example-notes"
                      name="notes"
                      placeholder="Что хотите изучить?"
                      aria-describedby="example-notes-hint"
                    />
                  </Field>
                  <Field
                    htmlFor="example-error"
                    label="Пример ошибки"
                    error="Проверьте адрес электронной почты"
                  >
                    <Input
                      id="example-error"
                      defaultValue="неверный адрес"
                      aria-invalid="true"
                      aria-describedby="example-error-error"
                    />
                  </Field>
                  <Checkbox
                    label="Показывать подсказки"
                    name="hints"
                    defaultChecked
                  />
                  <RadioGroup
                    legend="Пример выбора темпа"
                    name="pace"
                    defaultValue="calm"
                    options={[
                      { value: "calm", label: "Спокойный" },
                      { value: "focused", label: "Интенсивный" }
                    ]}
                  />
                  <Inline>
                    <Button type="submit">Проверить форму</Button>
                    <Button variant="ghost" type="reset">
                      Сбросить
                    </Button>
                  </Inline>
                  {formFeedback && <Alert tone="success">{formFeedback}</Alert>}
                </Stack>
              </form>
            </Surface>
          </Stack>
        </section>
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
                icon={<BookOpen size={28} />}
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
      </Stack>
    </div>
  );
}
