import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { YouTubeVideo } from "./youtube-video";

describe("deferred YouTube lesson media", () => {
  it("does not embed or request YouTube media before activation", () => {
    const html = renderToStaticMarkup(createElement(YouTubeVideo, { videoId: "aqz-KE-bpKQ", title: "Урок" }));
    expect(html).not.toMatch(/<iframe|<img|youtube-nocookie|<script/);
    expect(html).toContain("Смотреть видео");
    expect(html).toContain('href="https://www.youtube.com/watch?v=aqz-KE-bpKQ"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
