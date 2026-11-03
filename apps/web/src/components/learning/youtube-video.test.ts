import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { YouTubeVideo } from "./youtube-video";

describe("deferred YouTube lesson media", () => {
  it("does not embed or request YouTube media before activation", () => {
    const html = renderToStaticMarkup(
      createElement(YouTubeVideo, { videoId: "aqz-KE-bpKQ", title: "Урок" })
    );
    expect(html).not.toMatch(/<iframe|<img|youtube-nocookie|<script/);
    expect(html).toContain("Смотреть видео");
    expect(html).toContain(
      'href="https://www.youtube.com/watch?v=aqz-KE-bpKQ"'
    );
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("labels a reviewed external source without loading third-party media", () => {
    const html = renderToStaticMarkup(
      createElement(YouTubeVideo, {
        videoId: "mLgTnkw558w",
        title: "Основные части компьютера",
        source: "LearnFree"
      })
    );
    expect(html).toContain("ОТКРЫТОЕ ВИДЕО · LearnFree");
    expect(html).toContain("Внешний учебный материал");
    expect(html).not.toMatch(/<iframe|<img|youtube-nocookie|<script/);
  });

  it("keeps the initial frame out of the active mobile state", () => {
    const html = renderToStaticMarkup(
      createElement(YouTubeVideo, {
        videoId: "aqz-KE-bpKQ",
        title: "Урок"
      })
    );
    expect(html).not.toContain("frameActive");
    expect(html).toContain('aria-live="polite"');
  });
});
