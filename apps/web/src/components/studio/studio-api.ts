import { apiValidationErrorSchema } from "@platform/contracts";

import { browserApiRequest } from "../../lib/public-api";
export class StudioError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}
/** Reads a Studio API response. Callers parse the result with a contract schema. */
export async function studioRequest(
  path: string,
  body?: unknown
): Promise<unknown> {
  const response = await browserApiRequest(
    `/v1/${path}`,
    body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }
  );
  if (!response.ok) {
    const issues = await validationIssues(response);
    const message =
      response.status === 401
        ? "Войдите в аккаунт."
        : response.status === 403
          ? "Недостаточно прав для авторинга в этой организации."
          : response.status === 404
            ? "Курс недоступен."
            : response.status === 409
              ? "Черновик изменился или содержит несовместимые данные. Загрузите актуальный черновик и повторите проверку."
              : response.status === 400
                ? issues.join("\n") || "Проверьте поля документа."
                : "Не удалось завершить операцию. Проверьте сохранённый черновик перед повтором.";
    throw new StudioError(response.status, message);
  }
  return (await response.json()) as unknown;
}

/** Field issues from a 400 body; an unreadable body yields none. */
async function validationIssues(response: Response): Promise<string[]> {
  try {
    const parsed = apiValidationErrorSchema.safeParse(await response.json());
    return parsed.success
      ? parsed.data.issues.map((issue) => `${issue.path}: ${issue.message}`)
      : [];
  } catch {
    return [];
  }
}

/** A user-facing message for any rejected Studio operation. */
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Не удалось завершить операцию.";
}
export function downloadManifest(value: unknown, slug: string) {
  downloadManifestText(JSON.stringify(value, null, 2) + "\n", slug);
}
export function downloadManifestText(text: string, slug: string) {
  const blob = new Blob([text], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob),
    anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug || "course"}.manifest.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
