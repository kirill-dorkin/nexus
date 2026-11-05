import { SKILL_MAP } from "../lib/skill-map/skill-map";
import type { MetadataRoute } from "next";
import { blogArticles } from "../lib/blog";
import { loadLearningCatalog } from "../lib/public-learning";
import { courseUrl, lessonUrl } from "../lib/public-learning-routes";
import { absoluteUrl } from "../lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/courses"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/blog"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/map"), changeFrequency: "weekly", priority: 0.7 },
    {
      url: absoluteUrl("/characters"),
      changeFrequency: "weekly",
      priority: 0.8
    },
    ...SKILL_MAP.characters.map((character) => ({
      url: absoluteUrl(`/characters/${character.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7
    })),
    ...blogArticles.map((article) => ({
      url: absoluteUrl(`/blog/${article.slug}`),
      lastModified: new Date(article.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75
    }))
  ];

  try {
    const { courses } = await loadLearningCatalog();
    return [
      ...staticEntries,
      ...courses.flatMap((course) => [
        {
          url: absoluteUrl(courseUrl(course)),
          changeFrequency: "weekly" as const,
          priority: 0.85
        },
        ...course.course.lessons.map((lesson) => ({
          url: absoluteUrl(lessonUrl(course, lesson.slug)),
          changeFrequency: "monthly" as const,
          priority: 0.7
        }))
      ])
    ];
  } catch {
    return staticEntries;
  }
}
