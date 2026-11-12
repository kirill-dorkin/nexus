import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { VIDEO_LINKS, videoLinkPath } from "./video-links";

const manifest = (course: string) =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../../docs/examples/${course}-track.manifest.json`,
        import.meta.url
      ),
      "utf8"
    )
  ) as { course: { slug: string }; lessons: { slug: string }[] };

describe("video short links", () => {
  it("points every code at a lesson that exists in its course manifest", () => {
    for (const [code, target] of Object.entries(VIDEO_LINKS)) {
      expect(code).toMatch(/^[a-z]+[0-9]+$/);
      const course = manifest(target.course);
      expect(course.course.slug).toBe(target.course);
      expect(course.lessons.map((lesson) => lesson.slug)).toContain(
        target.lesson
      );
    }
  });

  it("opens the lesson with the video and platform as UTM tags", () => {
    expect(videoLinkPath(["py1", "yt"])).toBe(
      "/courses/python/why-python?utm_source=youtube&utm_medium=short_video&utm_campaign=py1"
    );
    expect(videoLinkPath(["SQL2"])).toBe(
      "/courses/sql/select-from?utm_source=video&utm_medium=short_video&utm_campaign=sql2"
    );
  });

  it("sends unknown codes and platforms to the catalog instead of a 404", () => {
    expect(videoLinkPath(["nope", "xx"])).toBe(
      "/courses?utm_source=video&utm_medium=short_video&utm_campaign=unknown"
    );
    expect(videoLinkPath(["constructor"])).toBe(
      "/courses?utm_source=video&utm_medium=short_video&utm_campaign=unknown"
    );
    expect(videoLinkPath([])).toContain("/courses?");
  });
});
