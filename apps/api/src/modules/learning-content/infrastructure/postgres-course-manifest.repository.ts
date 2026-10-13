import { ConflictException, Injectable } from "@nestjs/common";
import { courseManifestV1Schema, type LessonBlock, type CourseManifestV1 } from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { CourseManifestRepository, type ManifestCourseState } from "../application/course-manifest.repository";

@Injectable()
export class PostgresCourseManifestRepository extends CourseManifestRepository {
  async findState(tx: DatabaseTransaction, org: string, slug: string, lock: boolean): Promise<ManifestCourseState | null> {
    if (lock) {
      // Also serialize creation for a previously absent slug; never a global tenant lock.
      await tx.client.query("SELECT pg_advisory_xact_lock(hashtextextended(concat_ws(':','course-manifest',$1::text,$2::text),0))", [org, slug]);
    }
    const courses = await tx.client.query<{ id: string; status: string }>(
      `SELECT id::text,status FROM learning_content.courses WHERE organization_id=$1 AND slug=$2 ${lock ? "FOR UPDATE" : ""}`, [org, slug]
    );
    const course = courses.rows[0];
    if (!course) return null;
    const versions = await tx.client.query<{ id: string; status: string; authoring_revision: number; version_number: number }>(
      `SELECT id::text,status,authoring_revision,version_number FROM learning_content.course_versions WHERE organization_id=$1 AND course_id=$2 ORDER BY version_number DESC ${lock ? "FOR UPDATE" : ""}`, [org, course.id]
    );
    const draft = versions.rows.find((v) => v.status === "draft");
    return { courseId: course.id, status: course.status, draftVersionId: draft?.id ?? null, revision: draft?.authoring_revision ?? versions.rows[0]?.version_number ?? 0 };
  }

  async revision(tx: DatabaseTransaction, org: string, version: string): Promise<number | null> {
    return (await tx.client.query<{ authoring_revision: number }>("SELECT authoring_revision FROM learning_content.course_versions WHERE organization_id=$1 AND id=$2",[org,version])).rows[0]?.authoring_revision ?? null;
  }

  async lockVersion(tx: DatabaseTransaction, org: string, version: string): Promise<void> {
    await tx.client.query("SELECT id FROM learning_content.course_versions WHERE organization_id=$1 AND id=$2 FOR UPDATE", [org, version]);
  }

  async isManifestVersion(tx: DatabaseTransaction, org: string, version: string): Promise<boolean> {
    const r = await tx.client.query<{ managed: boolean }>("SELECT manifest_schema_version=1 AS managed FROM learning_content.course_versions WHERE organization_id=$1 AND id=$2", [org, version]);
    return r.rows[0]?.managed === true;
  }

  async requireCompatibleDraft(tx: DatabaseTransaction, org: string, version: string): Promise<void> {
    const r = await tx.client.query<{ incompatible: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM learning_content.course_version_activities a
        WHERE a.organization_id=$1 AND a.course_version_id=$2 AND
          (a.activity_type NOT IN ('quiz.single_choice','quiz.multiple_choice','quiz.short_text')
           OR a.config <> jsonb_build_object('presentation',a.config->'presentation','validation',jsonb_build_object('validatorKey',a.activity_type,'validatorVersion',1,'config','{}'::jsonb))
           OR NOT EXISTS (SELECT 1 FROM learning_content.quiz_validation_configs q WHERE q.organization_id=$1 AND q.activity_version_id=a.id)))
        OR EXISTS (SELECT 1 FROM learning_content.course_version_skill_remediations WHERE organization_id=$1 AND course_version_id=$2)
        OR EXISTS (SELECT 1 FROM learning_content.activity_skill_mappings WHERE organization_id=$1 AND course_version_id=$2 AND role<>'primary')
        OR EXISTS (SELECT 1 FROM learning_content.guided_build_definitions d JOIN learning_content.course_version_activities a ON a.organization_id=d.organization_id AND a.id=d.activity_version_id WHERE a.organization_id=$1 AND a.course_version_id=$2) AS incompatible`, [org, version]
    );
    if (r.rows[0]?.incompatible) throw new ConflictException("This draft contains authoring features outside manifest v1. Import would discard them; create a separate draft/course instead.");
  }

  async requireCompatibleSkills(tx: DatabaseTransaction, org: string, manifest: CourseManifestV1): Promise<void> {
    const r = await tx.client.query<{ skill_key: string }>("SELECT skill_key FROM learning_content.skills WHERE organization_id=$1 AND skill_key=ANY($2::text[]) AND status<>'active'", [org, manifest.skills.map((s) => s.key)]);
    if (r.rows.length) throw new ConflictException("The manifest references a retired organization skill.");
  }

  async requireCompatibleActivityIdentities(tx: DatabaseTransaction, org: string, course: string, manifest: CourseManifestV1): Promise<void> {
    const result = await tx.client.query<{ ambiguous: boolean }>(
      `SELECT EXISTS (SELECT a.slug FROM learning_content.course_version_activities a
        JOIN learning_content.course_versions v ON v.organization_id=a.organization_id AND v.id=a.course_version_id
        WHERE a.organization_id=$1 AND v.course_id=$2 AND a.slug=ANY($3::text[])
          AND NOT EXISTS (SELECT 1 FROM learning_content.manifest_activity_identities m WHERE m.organization_id=$1 AND m.course_id=$2 AND m.slug=a.slug)
        GROUP BY a.slug HAVING count(DISTINCT a.activity_id)>1) AS ambiguous`, [org, course, manifest.activities.map((a) => a.slug)]
    );
    if (result.rows[0]?.ambiguous) throw new ConflictException("Historical activity slug has ambiguous stable identity.");
  }

  async replaceDraft(tx: DatabaseTransaction, org: string, course: string, version: string, user: string, manifest: CourseManifestV1) {
    const createdSkills: { id: string; key: string }[] = [];
    // The version is already locked. Snapshot removal order follows FK ownership.
    await tx.client.query("DELETE FROM learning_content.course_version_lesson_blocks WHERE organization_id=$1 AND course_version_id=$2", [org, version]);
    await tx.client.query("DELETE FROM learning_content.course_version_lessons WHERE organization_id=$1 AND course_version_id=$2", [org, version]);
    await tx.client.query("DELETE FROM learning_content.quiz_validation_configs WHERE organization_id=$1 AND course_version_id=$2", [org, version]);
    await tx.client.query("DELETE FROM learning_content.activity_skill_mappings WHERE organization_id=$1 AND course_version_id=$2", [org, version]);
    await tx.client.query("DELETE FROM learning_content.course_version_activities WHERE organization_id=$1 AND course_version_id=$2", [org, version]);
    await tx.client.query("DELETE FROM learning_content.course_version_skills WHERE organization_id=$1 AND course_version_id=$2", [org, version]);
    await tx.client.query("UPDATE learning_content.course_versions SET title=$3,description=$4,manifest_schema_version=1,authoring_revision=authoring_revision+1,updated_at=now() WHERE organization_id=$1 AND id=$2 AND status='draft'", [org, version, manifest.course.title, manifest.course.description]);

    const skillIds = new Map<string, string>();
    for (const [position, skill] of manifest.skills.entries()) {
      const created = await tx.client.query<{ id: string }>(
        `INSERT INTO learning_content.skills (organization_id,skill_key,canonical_title,canonical_description,created_by_user_id)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (organization_id,skill_key) DO NOTHING RETURNING id::text`, [org, skill.key, skill.title, skill.description, user]
      );
      if (created.rows[0]) createdSkills.push({ id: created.rows[0].id, key: skill.key });
      const selected = await tx.client.query<{ id: string }>("SELECT id::text FROM learning_content.skills WHERE organization_id=$1 AND skill_key=$2 AND status='active'", [org, skill.key]);
      const id = selected.rows[0]?.id;
      if (!id) throw new ConflictException("Organization skill is not active.");
      skillIds.set(skill.key, id);
      // Imported presentation belongs to this snapshot, never to the shared canonical Skill.
      await tx.client.query("INSERT INTO learning_content.course_version_skills (organization_id,course_version_id,skill_id,title,description,position) VALUES ($1,$2,$3,$4,$5,$6)", [org, version, id, skill.title, skill.description, position]);
    }

    const activityIds = new Map<string, string>();
    for (const [position, activity] of manifest.activities.entries()) {
      let stable = (await tx.client.query<{ activity_id: string }>("SELECT activity_id::text FROM learning_content.manifest_activity_identities WHERE organization_id=$1 AND course_id=$2 AND slug=$3", [org, course, activity.slug])).rows[0]?.activity_id;
      if (!stable) {
        const history = await tx.client.query<{ activity_id: string }>(
          "SELECT DISTINCT a.activity_id::text FROM learning_content.course_version_activities a JOIN learning_content.course_versions v ON v.organization_id=a.organization_id AND v.id=a.course_version_id WHERE a.organization_id=$1 AND v.course_id=$2 AND a.slug=$3", [org, course, activity.slug]
        );
        if (history.rows.length > 1) throw new ConflictException("Historical activity slug has ambiguous stable identity.");
        stable = history.rows[0]?.activity_id;
        if (!stable) stable = (await tx.client.query<{ id: string }>("INSERT INTO learning_content.activities (organization_id,course_id,created_by_user_id) VALUES ($1,$2,$3) RETURNING id::text", [org, course, user])).rows[0]!.id;
        await tx.client.query("INSERT INTO learning_content.manifest_activity_identities (organization_id,course_id,slug,activity_id) VALUES ($1,$2,$3,$4)", [org, course, activity.slug, stable]);
      }
      activityIds.set(activity.slug, stable);
      const config = { presentation: activity.presentation, validation: { validatorKey: activity.type, validatorVersion: 1, config: {} } };
      const snapshot = (await tx.client.query<{ id: string }>(
        "INSERT INTO learning_content.course_version_activities (organization_id,course_version_id,activity_id,slug,activity_type,title,instructions,config,position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING id::text", [org, version, stable, activity.slug, activity.type, activity.title, activity.instructions, JSON.stringify(config), position]
      )).rows[0]!.id;
      await tx.client.query("INSERT INTO learning_content.quiz_validation_configs (organization_id,course_version_id,activity_version_id,config) VALUES ($1,$2,$3,$4::jsonb)", [org, version, snapshot, JSON.stringify(activity.validation)]);
      for (const skillKey of activity.skillKeys) {
        await tx.client.query("INSERT INTO learning_content.activity_skill_mappings (organization_id,course_version_id,activity_id,skill_id) VALUES ($1,$2,$3,$4)", [org, version, stable, skillIds.get(skillKey)]);
      }
    }
    for (const [position, lesson] of manifest.lessons.entries()) {
      await tx.client.query("INSERT INTO learning_content.lessons (organization_id,course_id,slug,created_by_user_id) VALUES ($1,$2,$3,$4) ON CONFLICT (organization_id,course_id,slug) DO NOTHING", [org, course, lesson.slug, user]);
      const lessonId = (await tx.client.query<{ id: string }>("SELECT id::text FROM learning_content.lessons WHERE organization_id=$1 AND course_id=$2 AND slug=$3", [org, course, lesson.slug])).rows[0]!.id;
      await tx.client.query("INSERT INTO learning_content.course_version_lessons (organization_id,course_id,course_version_id,lesson_id,title,summary,duration_minutes,position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [org, course, version, lessonId, lesson.title, lesson.summary, lesson.durationMinutes, position]);
      for (const [blockPosition, block] of lesson.blocks.entries()) {
        await tx.client.query("INSERT INTO learning_content.course_version_lesson_blocks (organization_id,course_version_id,lesson_id,position,block_type,video_id,markdown,activity_id,title,kind,required) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [org, version, lessonId, blockPosition, block.type, block.type === "youtube" ? block.videoId : null, block.type === "markdown" ? block.markdown : null, block.type === "activity" ? activityIds.get(block.activitySlug) : null, block.type === "activity" ? block.title ?? null : null, block.type === "activity" ? block.kind : null, block.type === "activity" ? block.required : null]);
      }
    }
    const revision = (await tx.client.query<{ authoring_revision: number }>("SELECT authoring_revision FROM learning_content.course_versions WHERE organization_id=$1 AND id=$2", [org, version])).rows[0]!.authoring_revision;
    return { revision, createdSkills };
  }

  async exportVersion(tx: DatabaseTransaction, org: string, course: string, version: string): Promise<CourseManifestV1> {
    await this.requireCompatibleDraft(tx, org, version);
    const ordering = await tx.client.query<{ invalid: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM (
         SELECT position,row_number() OVER (ORDER BY position,skill_id)-1 AS expected FROM learning_content.course_version_skills WHERE organization_id=$1 AND course_version_id=$2
         UNION ALL SELECT position,row_number() OVER (ORDER BY position,activity_id)-1 FROM learning_content.course_version_activities WHERE organization_id=$1 AND course_version_id=$2
         UNION ALL SELECT position,row_number() OVER (ORDER BY position,lesson_id)-1 FROM learning_content.course_version_lessons WHERE organization_id=$1 AND course_version_id=$2
         UNION ALL SELECT position,row_number() OVER (PARTITION BY lesson_id ORDER BY position)-1 FROM learning_content.course_version_lesson_blocks WHERE organization_id=$1 AND course_version_id=$2
       ) ordered WHERE position<>expected) AS invalid`, [org, version]
    );
    if (ordering.rows[0]?.invalid) throw new ConflictException("Draft positions must be contiguous, starting at zero, with no duplicates.");
    const meta = (await tx.client.query<{ slug: string; title: string; description: string | null }>("SELECT c.slug,v.title,v.description FROM learning_content.courses c JOIN learning_content.course_versions v ON v.organization_id=c.organization_id AND v.course_id=c.id WHERE c.organization_id=$1 AND c.id=$2 AND v.id=$3", [org, course, version])).rows[0];
    if (!meta) throw new ConflictException("Course version is not exportable.");
    const skills = await tx.client.query<{ key: string; title: string; description: string | null }>("SELECT s.skill_key AS key,v.title,v.description FROM learning_content.course_version_skills v JOIN learning_content.skills s ON s.organization_id=v.organization_id AND s.id=v.skill_id WHERE v.organization_id=$1 AND v.course_version_id=$2 ORDER BY v.position,s.skill_key", [org, version]);
    const activities = await tx.client.query<{ slug: string; type: string; title: string; instructions: string | null; presentation: unknown; validation: unknown; skillKeys: string[] }>(
      `SELECT a.slug,a.activity_type AS type,a.title,a.instructions,a.config->'presentation' AS presentation,q.config AS validation,
        ARRAY(SELECT s.skill_key FROM learning_content.activity_skill_mappings m JOIN learning_content.skills s ON s.organization_id=m.organization_id AND s.id=m.skill_id
          JOIN learning_content.course_version_skills vs ON vs.organization_id=m.organization_id AND vs.course_version_id=m.course_version_id AND vs.skill_id=m.skill_id
          WHERE m.organization_id=a.organization_id AND m.course_version_id=a.course_version_id AND m.activity_id=a.activity_id ORDER BY vs.position,s.skill_key) AS "skillKeys"
        FROM learning_content.course_version_activities a LEFT JOIN learning_content.quiz_validation_configs q ON q.organization_id=a.organization_id AND q.activity_version_id=a.id
        WHERE a.organization_id=$1 AND a.course_version_id=$2 ORDER BY a.position,a.slug`, [org, version]
    );
    const lessons = await tx.client.query<{ id: string; slug: string; title: string; summary: string; durationMinutes: number }>("SELECT v.lesson_id::text AS id,l.slug,v.title,v.summary,v.duration_minutes AS \"durationMinutes\" FROM learning_content.course_version_lessons v JOIN learning_content.lessons l ON l.organization_id=v.organization_id AND l.course_id=v.course_id AND l.id=v.lesson_id WHERE v.organization_id=$1 AND v.course_version_id=$2 ORDER BY v.position", [org, version]);
    const resultLessons = [];
    for (const lesson of lessons.rows) {
      const blocks = await tx.client.query<{ block_type: string; video_id: string | null; markdown: string | null; slug: string | null; title: string | null; kind: "practice" | "homework" | null; required: boolean | null }>("SELECT b.block_type,b.video_id,b.markdown,a.slug,b.title,b.kind,b.required FROM learning_content.course_version_lesson_blocks b LEFT JOIN learning_content.course_version_activities a ON a.organization_id=b.organization_id AND a.course_version_id=b.course_version_id AND a.activity_id=b.activity_id WHERE b.organization_id=$1 AND b.course_version_id=$2 AND b.lesson_id=$3 ORDER BY b.position", [org, version, lesson.id]);
      const mapped: LessonBlock[] = blocks.rows.map((b) => b.block_type === "youtube" ? { type: "youtube", videoId: b.video_id! } : b.block_type === "markdown" ? { type: "markdown", markdown: b.markdown! } : { type: "activity", activitySlug: b.slug!, ...(b.title === null ? {} : { title: b.title }), kind: b.kind!, required: b.required! });
      const { id: _id, ...metadata } = lesson;
      resultLessons.push({ ...metadata, blocks: mapped });
    }
    const result = courseManifestV1Schema.safeParse({ schemaVersion: 1, course: { ...meta, description: meta.description ?? "" }, skills: skills.rows.map((s) => ({ ...s, description: s.description ?? "" })), activities: activities.rows.map((a) => ({ ...a, instructions: a.instructions ?? "" })), lessons: resultLessons });
    if (!result.success) throw new ConflictException({ message: "Course graph is not valid manifest v1.", issues: result.error.issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })) });
    return result.data;
  }

  async cloneLatestPublished(tx: DatabaseTransaction, org: string, course: string, version: string): Promise<void> {
    const source = (await tx.client.query<{ id: string }>("SELECT id::text FROM learning_content.course_versions WHERE organization_id=$1 AND course_id=$2 AND status='published' ORDER BY version_number DESC LIMIT 1", [org, course])).rows[0]?.id;
    if (!source || !await this.isManifestVersion(tx, org, source)) return;
    await tx.client.query("UPDATE learning_content.course_versions SET manifest_schema_version=1 WHERE organization_id=$1 AND id=$2", [org, version]);
    await tx.client.query("INSERT INTO learning_content.course_version_lessons (organization_id,course_id,course_version_id,lesson_id,title,summary,duration_minutes,position) SELECT organization_id,course_id,$3,lesson_id,title,summary,duration_minutes,position FROM learning_content.course_version_lessons WHERE organization_id=$1 AND course_version_id=$2", [org, source, version]);
    await tx.client.query("INSERT INTO learning_content.course_version_lesson_blocks (organization_id,course_version_id,lesson_id,position,block_type,video_id,markdown,activity_id,title,kind,required) SELECT organization_id,$3,lesson_id,position,block_type,video_id,markdown,activity_id,title,kind,required FROM learning_content.course_version_lesson_blocks WHERE organization_id=$1 AND course_version_id=$2", [org, source, version]);
    await tx.client.query("INSERT INTO learning_content.quiz_validation_configs (organization_id,course_version_id,activity_version_id,config) SELECT q.organization_id,$3,target.id,q.config FROM learning_content.quiz_validation_configs q JOIN learning_content.course_version_activities a ON a.organization_id=q.organization_id AND a.id=q.activity_version_id JOIN learning_content.course_version_activities target ON target.organization_id=a.organization_id AND target.course_version_id=$3 AND target.activity_id=a.activity_id WHERE q.organization_id=$1 AND q.course_version_id=$2", [org, source, version]);
  }
}
