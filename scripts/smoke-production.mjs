// Read-only deployment smoke: no fake authentication, cookies or business writes.
const raw = process.argv[2];
const origin = new URL(raw);
if (
  origin.protocol !== "https:" ||
  origin.origin !== raw ||
  origin.username ||
  origin.password
)
  throw new Error("Provide an exact HTTPS origin.");
async function read(path, json = false) {
  const response = await fetch(`${origin.origin}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(15000)
  });
  if (response.status >= 300 && response.status < 400)
    throw new Error(
      `Deployment smoke failed at ${path}: unexpected redirect ${response.status} (check deployment protection and routes).`
    );
  if (!response.ok)
    throw new Error(`Deployment smoke failed at ${path}: ${response.status}`);
  return json ? response.json() : response.text();
}
const health = await read("/v1/health", true);
if (health.status !== "ok") throw new Error("API health is not ok.");
// An API 404 must remain an API 404, never the Next.js fallback page.
// Keep the probe read-only and do not send any session cookies.
const unknown = await fetch(`${origin.origin}/v1/nexus-production-smoke-unmatched`, {
  redirect: "manual",
  signal: AbortSignal.timeout(15000)
});
if (
  unknown.status !== 404 ||
  (unknown.headers.get("content-type") ?? "").includes("text/html")
)
  throw new Error(
    `API rewrite smoke failed: expected API 404 JSON, got ${unknown.status} (${unknown.headers.get("content-type") ?? "unknown"}).`
  );
const catalog = await read("/v1/public/learning", true);
if (!Array.isArray(catalog.courses))
  throw new Error("Canonical public learning catalog is unavailable.");
await read("/");
await read("/studio");
await read("/login");
if (catalog.courses.length) {
  const c = catalog.courses[0];
  await read(
    `/learn/${encodeURIComponent(c.organization.slug)}/${encodeURIComponent(c.offering.slug)}`
  );
}
console.log(
  "HTTPS Web/API/PostgreSQL public-read smoke passed. Authenticated learner writes require the separate browser acceptance flow."
);
