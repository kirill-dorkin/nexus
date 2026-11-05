import {
  courseManifestV1Schema,
  type CourseManifestV1
} from "@platform/contracts";
import type { DatabasePool } from "@platform/database";

// Test-only fixtures for the skill map (ADR-0078). HTTP controllers never import this module.

/** A small course: one quiz and one lesson per skill; the right answer is always `yes`. */
export function skillMapCourse(
  courseSlug: string,
  skillKeys: readonly string[]
): CourseManifestV1 {
  return courseManifestV1Schema.parse({
    schemaVersion: 1,
    course: { slug: courseSlug, title: "Курс карты", description: "Тест" },
    skills: skillKeys.map((key) => ({ key, title: `Навык ${key}` })),
    activities: skillKeys.map((key) => ({
      slug: `${key}-check`,
      type: "quiz.single_choice",
      title: `Проверка ${key}`,
      instructions: "Выберите ответ",
      skillKeys: [key],
      presentation: {
        question: "Верно?",
        options: [
          { id: "yes", text: "Да" },
          { id: "no", text: "Нет" }
        ]
      },
      validation: { correctOptionId: "yes", explanation: "Да." }
    })),
    lessons: skillKeys.map((key) => ({
      slug: `${key}-lesson`,
      title: `Урок ${key}`,
      durationMinutes: 5,
      blocks: [
        {
          type: "activity",
          activitySlug: `${key}-check`,
          kind: "practice",
          required: true
        }
      ]
    }))
  });
}

/**
 * A `skill-map@2` document: one character per entry, one branch each; inside a branch every
 * skill stands on the previous one, and a branch's first skill on the last skill of `requires`.
 */
export function skillMapManifest(
  courseSlug: string,
  characters: readonly {
    slug: string;
    skills: readonly string[];
    requires?: readonly string[];
  }[]
) {
  const branchOf = (slug: string) => `${slug}-1`;
  const lastSkill = new Map(
    characters.map((c) => [c.slug, c.skills[c.skills.length - 1]!] as const)
  );
  return {
    schemaVersion: 2 as const,
    unlockShare: 0.5,
    maxLevel: 100,
    characters: characters.map((c) => ({
      slug: c.slug,
      name: c.slug.toUpperCase(),
      role: "Роль персонажа",
      summary: "Описание персонажа для теста.",
      accent: "lime",
      published: true,
      abilities: [{ title: "Всё", branches: [branchOf(c.slug)] }],
      branches: [
        {
          id: branchOf(c.slug),
          title: "Ветка",
          depth: "core" as const,
          requires: (c.requires ?? []).map(branchOf),
          skills: c.skills.map((key, index) => ({
            key,
            title: `Навык ${key}`,
            lesson: { course: courseSlug, slug: `${key}-lesson`, title: "Урок" },
            prerequisites:
              index > 0
                ? [c.skills[index - 1]!]
                : (c.requires ?? []).map((slug) => lastSkill.get(slug)!)
          }))
        }
      ]
    }))
  };
}

/** Removes a test organization, including published skill map versions the trigger protects. */
export async function deleteSkillMapOrganization(
  migration: DatabasePool,
  organizationId: string
) {
  const client = await migration.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "ALTER TABLE learning_content.skill_map_prerequisites DISABLE TRIGGER skill_map_prerequisites_require_draft"
    );
    await client.query(
      "ALTER TABLE learning_content.skill_map_versions DISABLE TRIGGER skill_map_versions_protect"
    );
    for (const table of [
      "learning_content.skill_map_prerequisites",
      "learning_content.skill_map_versions",
      "learning_content.skill_maps"
    ])
      await client.query(`DELETE FROM ${table} WHERE organization_id=$1`, [
        organizationId
      ]);
    await client.query(
      "ALTER TABLE learning_content.skill_map_versions ENABLE TRIGGER skill_map_versions_protect"
    );
    await client.query(
      "ALTER TABLE learning_content.skill_map_prerequisites ENABLE TRIGGER skill_map_prerequisites_require_draft"
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  for (const table of [
    "events.outbox",
    "learning_history.learning_events",
    "learning_progress.evidence",
    "learning_validation.validation_results",
    "learning_progress.submissions",
    "learning_progress.attempts",
    "learning_progress.mastery_projections",
    "learning_delivery.enrollments",
    "learning_delivery.learning_offerings",
    "learning_content.course_version_lesson_blocks",
    "learning_content.course_version_lessons",
    "learning_content.quiz_validation_configs",
    "learning_content.activity_skill_mappings",
    "learning_content.course_version_activities",
    "learning_content.course_version_skills",
    "learning_content.activities",
    "learning_content.skills",
    "learning_content.courses"
  ])
    await migration.query(`DELETE FROM ${table} WHERE organization_id=$1`, [
      organizationId
    ]);
  await migration.query("DELETE FROM organizations.organizations WHERE id=$1", [
    organizationId
  ]);
}
