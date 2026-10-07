import "server-only";
import { resolveServerApiUrl } from "./server-api-url";

export function serverApiUrl(path: string): string {
  return resolveServerApiUrl(path, process.env.API_INTERNAL_URL);
}
