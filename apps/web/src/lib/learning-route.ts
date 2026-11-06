import { itemAt } from "./item-at";
import {
  HOME_ORGANIZATION_SLUG,
  type CourseAddress
} from "./public-learning-routes";

/**
 * The home catalog's learning route (ADR-0066): the order in which a newcomer takes the courses,
 * what each one expects and what it gives. It is presentation only: it orders and links published
 * home-organization courses and never grants access, enrolls or gates a lesson. A step whose course
 * is not published is skipped, so the route never links to a missing page.
 */
export type RouteStep = {
  /** Stable course slug (ADR-0061). */
  slug: string;
  label: string;
  needs: string;
  outcome: string;
  /** The previous step is the expected preparation, so the course page points back to it. */
  buildsOnPrevious: boolean;
};

export const LEARNING_ROUTE = {
  title: "IT с нуля",
  steps: [
    {
      slug: "pc",
      buildsOnPrevious: false,
      label: "ПК",
      needs: "Ничего: начинаем с того, как устроен компьютер.",
      outcome:
        "Уверенно работать с компьютером: файлы и папки, программы, система, командная строка, сеть и безопасность."
    },
    {
      slug: "browser",
      buildsOnPrevious: true,
      label: "Браузер",
      needs: "Уверенно пользоваться компьютером.",
      outcome:
        "Понимать, как браузер находит и показывает сайты, разбираться в адресах, HTTP, cookies и пользоваться DevTools."
    },
    {
      slug: "html",
      buildsOnPrevious: true,
      label: "HTML",
      needs: "Уверенно пользоваться браузером.",
      outcome:
        "Размечать страницы, ссылки, таблицы и формы так, чтобы их понимали браузеры, поисковики и скринридеры."
    },
    {
      slug: "css",
      buildsOnPrevious: true,
      label: "CSS",
      needs: "HTML: теги, атрибуты и структура страницы.",
      outcome:
        "Оформлять сайты: цвет, шрифты, отступы, Flexbox, Grid, адаптивность и анимации."
    },
    {
      slug: "js",
      buildsOnPrevious: true,
      label: "JavaScript",
      needs: "HTML и CSS на уровне готовой вёрстки страницы.",
      outcome:
        "Оживлять страницы: данные, функции, события, формы и запросы к серверу."
    },
    {
      slug: "sql",
      buildsOnPrevious: false,
      label: "SQL",
      needs:
        "Уверенно пользоваться компьютером. Опыт программирования поможет, но не обязателен.",
      outcome:
        "Хранить данные в PostgreSQL и получать из них ответы: выборки, соединения, агрегаты и свои таблицы."
    }
  ] satisfies RouteStep[]
} as const;

const isHome = (course: CourseAddress) =>
  course.organization.slug === HOME_ORGANIZATION_SLUG;
const stepIndex = (course: CourseAddress) =>
  isHome(course)
    ? LEARNING_ROUTE.steps.findIndex((step) => step.slug === course.course.slug)
    : -1;

/** Route courses first, in route order; every other course keeps its catalog order after them. */
export function orderByRoute<T extends CourseAddress>(
  courses: readonly T[]
): T[] {
  const rank = (course: T) => {
    const index = stepIndex(course);
    return index < 0 ? LEARNING_ROUTE.steps.length : index;
  };
  return courses
    .map((course, position) => ({ course, position }))
    .sort((a, b) => rank(a.course) - rank(b.course) || a.position - b.position)
    .map(({ course }) => course);
}

export type RoutePosition<T> = {
  title: string;
  /** 1-based number among the published steps. */
  number: number;
  total: number;
  step: RouteStep;
  steps: { step: RouteStep; course: T }[];
  previous: { step: RouteStep; course: T } | null;
  next: { step: RouteStep; course: T } | null;
};

/** Where a course sits in the route, counting only the steps present in `catalog`. */
export function routePosition<T extends CourseAddress>(
  course: CourseAddress,
  catalog: readonly T[]
): RoutePosition<T> | null {
  const steps = LEARNING_ROUTE.steps.flatMap((step) => {
    const found = catalog.find(
      (item) => isHome(item) && item.course.slug === step.slug
    );
    return found ? [{ step, course: found }] : [];
  });
  const index = isHome(course)
    ? steps.findIndex(({ step }) => step.slug === course.course.slug)
    : -1;
  if (index < 0) return null;
  return {
    title: LEARNING_ROUTE.title,
    number: index + 1,
    total: steps.length,
    step: itemAt(steps, index).step,
    steps,
    previous: steps[index - 1] ?? null,
    next: steps[index + 1] ?? null
  };
}

/** The fixed route step number of a course (for cards), or null outside the route. */
export function routeStepNumber(course: CourseAddress) {
  const index = stepIndex(course);
  return index < 0 ? null : index + 1;
}
