"use client";

import { useState, type SubmitEvent } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Field,
  Grid,
  Heading,
  Inline,
  Input,
  PasswordInput,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Surface,
  Text,
  Textarea
} from "@platform/ui";

export function FormsSection() {
  const [formFeedback, setFormFeedback] = useState("");
  function submitExample(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormFeedback(
      "Форма прошла проверку. Это пример: данные никуда не отправлены."
    );
  }
  return (
    <section aria-labelledby="ui-forms">
      <Stack gap="lg">
        <Heading level={2} id="ui-forms">
          04 / Поля и выбор
        </Heading>
        <Surface appearance="solid">
          <form onSubmit={submitExample} onReset={() => setFormFeedback("")}>
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
                htmlFor="example-password"
                label="Пример поля пароля"
                hint="Демонстрация показа и скрытия, без отправки."
              >
                <PasswordInput
                  id="example-password"
                  autoComplete="off"
                  aria-describedby="example-password-hint"
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
              <Radio
                label="Отдельный вариант выбора"
                name="single-example"
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
  );
}
