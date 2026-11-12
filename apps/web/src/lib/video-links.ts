/**
 * Short links for short videos (Reels, Shorts, VK Клипы, Telegram): `/r/{code}` or
 * `/r/{code}/{platform}` opens the lesson the video explains and tags the visit with UTM, so
 * PostHog shows which video and platform brought a learner (ADR-0086). Links are temporary
 * redirects: a code can be pointed at a better lesson later without breaking old videos.
 *
 * Add a code when a video is published. `video-links.test.ts` checks every target against the
 * course manifests in `docs/examples/`.
 */
export type VideoLinkTarget = { course: string; lesson: string };

export const VIDEO_LINKS: Readonly<Record<string, VideoLinkTarget>> = {
  py1: { course: "python", lesson: "why-python" },
  py2: { course: "python", lesson: "print-input" },
  js1: { course: "js", lesson: "variables" },
  js2: { course: "js", lesson: "types" },
  sql1: { course: "sql", lesson: "what-is-database" },
  sql2: { course: "sql", lesson: "select-from" },
  sql3: { course: "sql", lesson: "distinct" },
  git1: { course: "git", lesson: "why-git" },
  git2: { course: "git", lesson: "status" },
  web1: { course: "html", lesson: "how-the-web-works" }
};

/** Platform suffixes for the same video posted in several places. */
export const VIDEO_PLATFORMS: Readonly<Record<string, string>> = {
  ig: "instagram",
  yt: "youtube",
  vk: "vk",
  tg: "telegram",
  tt: "tiktok"
};

/** Where `/r/{code}[/{platform}]` leads: a site path with UTM parameters. */
export function videoLinkPath(parts: readonly string[]): string {
  const [rawCode = "", rawPlatform = ""] = parts;
  const code = rawCode.toLowerCase();
  const target = Object.hasOwn(VIDEO_LINKS, code)
    ? VIDEO_LINKS[code]
    : undefined;
  const platform = rawPlatform.toLowerCase();
  const query = new URLSearchParams({
    utm_source: Object.hasOwn(VIDEO_PLATFORMS, platform)
      ? (VIDEO_PLATFORMS[platform] ?? "video")
      : "video",
    utm_medium: "short_video",
    utm_campaign: target ? code : "unknown"
  });
  const path = target
    ? `/courses/${encodeURIComponent(target.course)}/${encodeURIComponent(target.lesson)}`
    : "/courses";
  return `${path}?${query.toString()}`;
}
