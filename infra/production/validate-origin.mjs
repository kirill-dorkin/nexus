const origin = process.env.NEXT_PUBLIC_API_ORIGIN;
const url = new URL(origin);
if (
  url.protocol !== "https:" ||
  url.origin !== origin ||
  url.username ||
  url.password
) {
  throw new Error("NEXT_PUBLIC_API_ORIGIN must be a canonical HTTPS origin.");
}
