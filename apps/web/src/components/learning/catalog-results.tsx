"use client";
import { useState } from "react";
import type { PublicLearningCourse } from "@platform/contracts";
import { Button, EmptyState, Field, Input, Text } from "@platform/ui";
import { CourseList } from "./course-list";
import styles from "./flow.module.css";

export function CatalogResults({
  courses
}: {
  courses: PublicLearningCourse[];
}) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase("ru-RU");
  const matches = courses.filter((c) =>
    `${c.course.title} ${c.course.description} ${c.organization.name}`
      .toLocaleLowerCase("ru-RU")
      .includes(search)
  );
  if (!courses.length) return <CourseList courses={[]} />;
  return (
    <>
      <form
        role="search"
        className={styles.catalogSearch}
        onSubmit={(e) => e.preventDefault()}
      >
        <Field htmlFor="course-search" label="Поиск по каталогу">
          <Input
            id="course-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название или тема"
            autoComplete="off"
          />
        </Field>
        <Text size="sm" muted role="status">
          {search
            ? `По запросу найдено: ${matches.length}`
            : `${courses.length} ${courses.length === 1 ? "доступный курс" : "доступных курса"}`}
        </Text>
      </form>
      {matches.length ? (
        <CourseList courses={matches} />
      ) : (
        <EmptyState
          title="Ничего не нашлось"
          action={
            <Button variant="secondary" onClick={() => setQuery("")}>
              Сбросить поиск
            </Button>
          }
        >
          Попробуйте другое название или тему.
        </EmptyState>
      )}
    </>
  );
}
