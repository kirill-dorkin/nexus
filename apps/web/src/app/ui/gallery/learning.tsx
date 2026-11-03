"use client";

import { Heading, Stack, Text } from "@platform/ui";
import { CourseList } from "../../../components/learning/course-list";
import { YouTubeVideo } from "../../../components/learning/youtube-video";

export function CourseListSection() {
  return (
    <section aria-labelledby="ui-course-list">
      <Stack gap="lg">
        <Heading level={2} id="ui-course-list">
          07 / Каталог и длинные названия
        </Heading>
        <Text muted>
          Демонстрационные данные для проверки переносов. Эти курсы не
          опубликованы; ссылки показывают формат маршрута.
        </Text>
        <CourseList
          courses={[
            {
              organization: {
                slug: "ui-example",
                name: "Пример учебной организации"
              },
              offering: { slug: "intro", name: "Пример курса" },
              course: {
                slug: "web-basics",
                title: "Основы веб-разработки",
                description:
                  "Пример описания курса: от структуры документа к оформлению и взаимодействию.",
                lessons: [
                  {
                    slug: "start",
                    title: "Пример урока",
                    summary: "",
                    durationMinutes: 15
                  }
                ]
              }
            },
            {
              organization: {
                slug: "ui-example",
                name: "Учебная организация с длинным демонстрационным названием"
              },
              offering: {
                slug: "architecture",
                name: "Пример длинного курса"
              },
              course: {
                slug: "web-architecture",
                title:
                  "Архитектура веб-приложений: от первой страницы до взаимодействия клиента и сервера",
                description:
                  "Демонстрационный текст проверяет кириллицу и плотность каталога. Название и описание переносятся полностью, а переход остаётся доступным на узком экране.",
                lessons: [
                  {
                    slug: "example",
                    title: "Пример урока",
                    summary: "",
                    durationMinutes: 20
                  },
                  {
                    slug: "second-example",
                    title: "Второй пример",
                    summary: "",
                    durationMinutes: 10
                  }
                ]
              }
            }
          ]}
        />
        <CourseList courses={[]} />
      </Stack>
    </section>
  );
}

export function VideoSection() {
  return (
    <section aria-labelledby="ui-lesson-video">
      <Stack gap="lg">
        <Heading level={2} id="ui-lesson-video">
          08 / Видео урока
        </Heading>
        <Text muted>
          Демонстрационное состояние. До нажатия платформа не загружает iframe,
          превью или SDK YouTube; в настоящем уроке автор задаёт ссылку в
          Studio.
        </Text>
        <YouTubeVideo
          videoId="aqz-KE-bpKQ"
          title="Как устроен компьютер: демонстрация видео"
        />
      </Stack>
    </section>
  );
}
