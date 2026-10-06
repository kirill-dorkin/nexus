import { browserApiRequest } from "../../lib/public-api";
export class StudioError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}
export async function studioRequest(path: string, body?: unknown) {
  const response = await browserApiRequest(
    `/v1/${path}`,
    body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }
  );
  if (!response.ok) {
    let issues: string[] = [];
    try {
      const data = await response.json();
      if (Array.isArray(data.issues))
        issues = data.issues.map(
          (i: { path: string; message: string }) => `${i.path}: ${i.message}`
        );
    } catch {}
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
  return response.json();
}
export function downloadManifest(value: unknown, slug: string) {
  const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob),
    anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug || "course"}.manifest.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
