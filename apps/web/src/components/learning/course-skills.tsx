"use client";
import { type LearnerSkillProgress } from "@platform/contracts";
import { clientLearnerCourseSkillsSchema as learnerCourseSkillsSchema } from "@platform/contracts/client";
import { Heading, Stack, Text } from "@platform/ui";
import { useApiResource } from "../../lib/hooks/api-resource";
import { LearningLoading } from "./learning-loading";
import {
  masteredSkillCount,
  masteryPercent,
  skillStateLabel
} from "./skill-labels";
import styles from "./course-skills.module.css";

/** The caller's own skills endpoint for one course offering. */
export function courseSkillsPath(
  organizationSlug: string,
  offeringSlug: string
) {
  return `/v1/me/learning/${encodeURIComponent(organizationSlug)}/${encodeURIComponent(offeringSlug)}/skills`;
}

function SkillItem({ skill }: { skill: LearnerSkillProgress }) {
  const label = skillStateLabel(skill);
  return (
    <li className={styles.skill}>
      <div className={styles.skillHead}>
        <span className={styles.skillTitle}>{skill.title}</span>
        <span className={styles.skillState}>{label}</span>
      </div>
      {skill.state === "assessed" && (
        <progress
          className={styles.meter}
          max={100}
          value={masteryPercent(skill.masteryScore)}
          aria-label={`${skill.title}: ${label}`}
        />
      )}
    </li>
  );
}

/**
 * «Навыки курса» inside the course entry, rendered only once it confirmed an
 * enrollment; `version` reloads it after new practice results.
 */
export function CourseSkills({
  organizationSlug,
  offeringSlug,
  version = 0
}: {
  organizationSlug: string;
  offeringSlug: string;
  version?: number;
}) {
  const [resource] = useApiResource(
    courseSkillsPath(organizationSlug, offeringSlug),
    learnerCourseSkillsSchema,
    version
  );
  if (resource.status === "anonymous") return null;
  if (resource.status === "ready" && resource.data.skills.length === 0)
    return null;
  return (
    <section
      aria-labelledby="course-skills-title"
      aria-busy={resource.status === "loading"}
    >
      <Stack gap="md">
        <Heading level={3} size="small" id="course-skills-title">
          Навыки курса
        </Heading>
        {resource.status === "loading" && (
          <LearningLoading>Загружаем навыки…</LearningLoading>
        )}
        {resource.status === "error" && (
          <Text muted size="sm">
            Не удалось загрузить навыки. Обновите страницу позже.
          </Text>
        )}
        {resource.status === "ready" && (
          <ul className={styles.skills}>
            {resource.data.skills.map((skill) => (
              <SkillItem key={skill.skillId} skill={skill} />
            ))}
          </ul>
        )}
      </Stack>
    </section>
  );
}

/** «освоено навыков: X из Y» for one course in «Моё обучение». */
export function CourseSkillsCount({
  organizationSlug,
  offeringSlug
}: {
  organizationSlug: string;
  offeringSlug: string;
}) {
  const [resource] = useApiResource(
    courseSkillsPath(organizationSlug, offeringSlug),
    learnerCourseSkillsSchema
  );
  if (resource.status !== "ready" || resource.data.skills.length === 0)
    return null;
  const { skills } = resource.data;
  return (
    <Text muted size="sm">
      Освоено навыков: {masteredSkillCount(skills)} из {skills.length}
    </Text>
  );
}
