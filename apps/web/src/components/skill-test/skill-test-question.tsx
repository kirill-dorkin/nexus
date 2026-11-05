"use client";
import { useId } from "react";
import type {
  SkillTestAnswer,
  SkillTestQuestionPresentation
} from "@platform/contracts";
import { Checkbox, CodeBlock, Field, Input, Radio, Text } from "@platform/ui";

import { SafeMarkdown } from "../learning/safe-markdown";
import styles from "./skill-test.module.css";

const LEGEND: Record<SkillTestQuestionPresentation["kind"], string> = {
  single_choice: "Выберите один вариант",
  multiple_choice: "Выберите все подходящие варианты",
  short_text: "Введите короткий ответ",
  code_output: "Что получится? Выберите один вариант",
  find_bug: "Где ошибка? Выберите один вариант"
};

const LANGUAGE: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  js: "JavaScript",
  ts: "TypeScript",
  sql: "SQL",
  text: "Текст"
};

/** One question of a draw; the answer is lifted to the test. */
export function SkillTestQuestion({
  question,
  answer,
  onAnswer
}: {
  question: SkillTestQuestionPresentation;
  answer: SkillTestAnswer | undefined;
  onAnswer: (answer: SkillTestAnswer) => void;
}) {
  const id = useId();
  const target = { skillKey: question.skillKey, key: question.key };
  const selected = answer && "optionIds" in answer ? answer.optionIds : [];
  const text = answer && "text" in answer ? answer.text : "";
  return (
    <div className={styles.question}>
      <SafeMarkdown>{question.prompt}</SafeMarkdown>
      {question.code && (
        <figure className={styles.code}>
          <figcaption>
            <Text size="sm" muted>
              {LANGUAGE[question.code.language] ?? question.code.language}
            </Text>
          </figcaption>
          <CodeBlock>{question.code.source}</CodeBlock>
        </figure>
      )}
      <fieldset className={styles.choices}>
        <legend>{LEGEND[question.kind]}</legend>
        {question.kind === "short_text" ? (
          <Field htmlFor={`${id}-text`} label="Ваш ответ">
            <Input
              id={`${id}-text`}
              value={text}
              maxLength={2000}
              autoComplete="off"
              onChange={(event) =>
                onAnswer({ ...target, text: event.target.value })
              }
            />
          </Field>
        ) : (
          (question.options ?? []).map((option) => {
            const multiple = question.kind === "multiple_choice";
            const Choice = multiple ? Checkbox : Radio;
            return (
              <Choice
                key={option.id}
                label={option.text}
                name={id}
                value={option.id}
                checked={selected.includes(option.id)}
                onChange={(event) =>
                  onAnswer({
                    ...target,
                    optionIds: !multiple
                      ? [option.id]
                      : event.target.checked
                        ? [...selected, option.id]
                        : selected.filter((x) => x !== option.id)
                  })
                }
              />
            );
          })
        )}
      </fieldset>
    </div>
  );
}

/** Whether a question has an answer the server would accept. */
export const isAnswered = (answer: SkillTestAnswer | undefined) =>
  answer !== undefined &&
  ("text" in answer
    ? answer.text.trim().length > 0
    : answer.optionIds.length > 0);
