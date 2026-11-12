import { videoLinkPath } from "../../../lib/video-links";

/** Short video links: a temporary redirect to the lesson with UTM tags (lib/video-links.ts). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ parts: string[] }> }
) {
  const { parts } = await params;
  return new Response(null, {
    status: 302,
    headers: {
      location: new URL(videoLinkPath(parts), request.url).toString(),
      "cache-control": "no-store"
    }
  });
}
