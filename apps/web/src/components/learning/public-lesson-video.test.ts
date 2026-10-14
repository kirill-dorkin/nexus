import { describe, expect, it } from "vitest";
import { getPublicLessonVideo } from "./public-lesson-video";

describe("public lesson video supplements", () => {
  it("returns the reviewed video only for the exact Preview lesson", () => {
    expect(
      getPublicLessonVideo(
        "nexus-preview",
        "computer-literacy-course",
        "computer"
      )
    ).toEqual({
      videoId: "mLgTnkw558w",
      title: "Основные части компьютера",
      source: "LearnFree"
    });

    expect(
      getPublicLessonVideo(
        "another-organization",
        "computer-literacy-course",
        "computer"
      )
    ).toBeNull();
    expect(
      getPublicLessonVideo(
        "nexus-preview",
        "computer-literacy-course",
        "files"
      )
    ).toBeNull();
  });
});
