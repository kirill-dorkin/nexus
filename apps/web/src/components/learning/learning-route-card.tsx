import Link from "next/link";
import type { PublicLearningCourse } from "@platform/contracts";
import { routePosition } from "../../lib/learning-route";
import { courseUrl } from "../../lib/public-learning-routes";
import styles from "./flow.module.css";

/** Course page: where this course sits in the route, what it expects and what comes next (ADR-0066). */
export function LearningRouteCard({
  course,
  catalog
}: {
  course: PublicLearningCourse;
  catalog: readonly PublicLearningCourse[];
}) {
  const route = routePosition(course, catalog);
  if (!route) return null;
  const { step, previous, next } = route;
  return (
    <section className={styles.route} aria-labelledby="route-title">
      <p className={styles.startKicker} id="route-title">
        Маршрут «{route.title}» · курс {route.number} из {route.total}
      </p>
      <ol className={styles.routeSteps}>
        {route.steps.map((item, index) => (
          <li key={item.step.slug}>
            {item.step.slug === step.slug ? (
              <span aria-current="step">
                {index + 1}. {item.step.label}
              </span>
            ) : (
              <Link href={courseUrl(item.course)}>
                {index + 1}. {item.step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <dl className={styles.routeFacts}>
        <div>
          <dt>Что нужно знать</dt>
          <dd>
            {step.needs}
            {step.buildsOnPrevious && previous && (
              <>
                {" "}
                Если пока нет — начните с курса{" "}
                <Link href={courseUrl(previous.course)}>
                  {previous.course.course.title}
                </Link>
                .
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Что будете уметь</dt>
          <dd>{step.outcome}</dd>
        </div>
        {next && (
          <div>
            <dt>Дальше</dt>
            <dd>
              <Link href={courseUrl(next.course)}>
                {next.course.course.title}
              </Link>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
