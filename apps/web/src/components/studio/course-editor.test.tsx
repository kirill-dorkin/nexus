import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { manifest, studioDraft } from "../../test/fixtures";
import { CourseEditor } from "./course-editor";
import { downloadManifest, StudioError, studioRequest } from "./studio-api";

const router = { push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./studio-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./studio-api")>()),
  studioRequest: vi.fn(),
  downloadManifest: vi.fn(),
  downloadManifestText: vi.fn()
}));
const api = vi.mocked(studioRequest);

const org = "0195d9a8-6c8e-7000-8000-0000000000f1";
const draft = studioDraft();
const base = `organizations/${org}`;
const coursePath = `${base}/studio/courses/${draft.courseId}`;
const plan = {
  mode: "replace_draft",
  courseId: draft.courseId,
  expectedDraftVersionId: draft.versionId,
  expectedRevision: draft.revision,
  counts: { skills: 1, activities: 1, lessons: 1 }
};

/** Answers Studio requests by path, in order; anything else fails the test. */
function routes(table: Record<string, unknown[]>) {
  api.mockImplementation((path) => {
    const queue = table[path];
    if (!queue?.length) return Promise.reject(new Error(`Unexpected ${path}`));
    const next = queue.shift();
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
}
function renderEditor(courseId: string = draft.courseId) {
  render(<CourseEditor organizationId={org} courseId={courseId} />);
}
const button = (name: string | RegExp) => screen.getByRole("button", { name });

beforeEach(() => {
  api.mockReset();
  router.push.mockReset();
  router.replace.mockReset();
});

describe("CourseEditor", () => {
  it("opens the saved draft", async () => {
    routes({ [coursePath]: [draft] });
    renderEditor();
    expect(
      await screen.findByRole("heading", { level: 1, name: "HTML с нуля" })
    ).toBeInTheDocument();
    expect(screen.getByText("Черновик · версия 2")).toBeInTheDocument();
    expect(
      screen.getByText("Загружена сохранённая версия")
    ).toBeInTheDocument();
    expect(button("Сохранить черновик")).toBeDisabled();
  });

  it("validates the edited document, then saves exactly that copy", async () => {
    const saved = studioDraft({
      revision: 4,
      manifest: {
        ...manifest(),
        course: { ...manifest().course, title: "Новое" }
      }
    });
    routes({
      [coursePath]: [draft, saved],
      [`${base}/courses/manifest/validate`]: [plan],
      [`${base}/courses/manifest/apply`]: [
        {
          courseId: draft.courseId,
          draftVersionId: draft.versionId,
          revision: 4,
          counts: plan.counts
        }
      ]
    });
    renderEditor();
    fireEvent.change(await screen.findByLabelText("Название курса"), {
      target: { value: "Новое" }
    });
    expect(
      screen.getByText("Есть несохранённые изменения")
    ).toBeInTheDocument();

    await userEvent.click(button("Проверить документ"));
    expect(
      await screen.findByText("Проверка пройдена. Можно сохранить черновик.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/План: замена текущего черновика; навыков: 1/)
    ).toBeInTheDocument();

    await userEvent.click(button("Сохранить черновик"));
    expect(await screen.findByText("Черновик сохранён.")).toBeInTheDocument();
    const applied = api.mock.calls.find(([path]) =>
      path.endsWith("/apply")
    )?.[1] as {
      manifest: { course: { title: string } };
      expectedDraftVersionId: string;
      expectedRevision: number;
    };
    expect(applied.manifest.course.title).toBe("Новое");
    expect(applied).toMatchObject({
      expectedDraftVersionId: draft.versionId,
      expectedRevision: 3
    });
  });

  it("stops when the server already holds a different draft", async () => {
    routes({
      [coursePath]: [draft],
      [`${base}/courses/manifest/validate`]: [{ ...plan, expectedRevision: 9 }]
    });
    renderEditor();
    await userEvent.click(
      await screen.findByRole("button", { name: "Проверить документ" })
    );

    expect(
      await screen.findByText("Проверьте актуальный черновик")
    ).toBeInTheDocument();
    expect(button("Проверить документ")).toBeDisabled();
    expect(button("Сохранить черновик")).toBeDisabled();
  });

  it("lists the issues of an invalid document instead of sending it", async () => {
    routes({ [coursePath]: [draft] });
    renderEditor();
    fireEvent.change(await screen.findByLabelText("Адрес урока (slug)"), {
      target: { value: "Не slug" }
    });
    await userEvent.click(button("Проверить документ"));
    expect(screen.getByText("Исправьте документ")).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("edits the same document as JSON and refuses to leave broken JSON", async () => {
    routes({ [coursePath]: [draft] });
    renderEditor();
    await userEvent.click(await screen.findByRole("button", { name: "JSON" }));
    const json = screen.getByLabelText("Manifest JSON");
    expect(json).toHaveValue(JSON.stringify(draft.manifest, null, 2));

    fireEvent.change(json, { target: { value: "{ broken" } });
    await userEvent.click(button("Ручной редактор"));
    expect(
      screen.getByText("JSON: проверьте синтаксис документа.")
    ).toBeInTheDocument();
    expect(button("JSON")).toHaveAttribute("aria-pressed", "true");

    const edited = {
      ...draft.manifest,
      course: { ...draft.manifest.course, title: "Из JSON" }
    };
    fireEvent.change(json, { target: { value: JSON.stringify(edited) } });
    await userEvent.click(button("Ручной редактор"));
    expect(screen.getByLabelText("Название курса")).toHaveValue("Из JSON");
  });

  it("publishes the saved draft from the preview after confirmation", async () => {
    routes({
      [coursePath]: [draft, studioDraft({ status: "published" })],
      [`${coursePath}/publish`]: [{}]
    });
    renderEditor();
    const publish = await screen.findByRole("button", {
      name: "Опубликовать версию 2"
    });
    expect(publish).toBeDisabled();
    expect(
      screen.getByText(
        "Откройте предпросмотр, чтобы проверить сохранённую версию."
      )
    ).toBeInTheDocument();

    await userEvent.click(button("Предпросмотр"));
    await userEvent.click(publish);
    await userEvent.click(button("Подтвердить публикацию"));

    expect(await screen.findByText(/Версия опубликована/)).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(`${coursePath}/publish`, {
      draftVersionId: draft.versionId,
      expectedRevision: 3
    });
  });

  it("creates the next draft of a published version", async () => {
    routes({
      [coursePath]: [studioDraft({ status: "published" }), draft],
      [`${coursePath}/draft`]: [{}]
    });
    renderEditor();
    expect(
      await screen.findByText(/Эта версия неизменяема/)
    ).toBeInTheDocument();
    await userEvent.click(button("Создать следующий черновик"));
    expect(
      await screen.findByText("Создан следующий черновик.")
    ).toBeInTheDocument();
  });

  it("keeps a new course read-only without the right to create", async () => {
    routes({
      [`${base}/studio/courses`]: [
        { courses: [], nextCursor: null, canCreate: false }
      ]
    });
    renderEditor("new");
    expect(
      await screen.findByText(/Для сохранения нужны права/)
    ).toBeInTheDocument();
    expect(button("Проверить документ")).toBeDisabled();
  });

  it("opens a newly created course after saving", async () => {
    routes({
      [`${base}/studio/courses`]: [
        { courses: [], nextCursor: null, canCreate: true }
      ],
      [`${base}/courses/manifest/validate`]: [
        {
          ...plan,
          mode: "create_course",
          courseId: null,
          expectedDraftVersionId: null,
          expectedRevision: 0
        }
      ],
      [`${base}/courses/manifest/apply`]: [
        {
          courseId: draft.courseId,
          draftVersionId: draft.versionId,
          revision: 1,
          counts: plan.counts
        }
      ]
    });
    renderEditor("new");
    await userEvent.click(await screen.findByRole("button", { name: "JSON" }));
    fireEvent.change(screen.getByLabelText("Manifest JSON"), {
      target: { value: JSON.stringify(manifest()) }
    });
    await userEvent.click(button("Проверить документ"));
    await userEvent.click(
      await screen.findByRole("button", { name: "Сохранить черновик" })
    );
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith(
        `/studio/${org}/${draft.courseId}`
      );
    });
  });

  it("asks to sign in when the session is missing", async () => {
    routes({ [coursePath]: [new StudioError(401, "Войдите в аккаунт.")] });
    renderEditor();
    expect(
      await screen.findByRole("link", { name: "Войти в Studio" })
    ).toHaveAttribute(
      "href",
      `/login?returnTo=${encodeURIComponent(`/studio/${org}/${draft.courseId}`)}`
    );
  });

  it("asks before leaving with unsaved changes", async () => {
    routes({ [coursePath]: [draft] });
    renderEditor();
    fireEvent.change(await screen.findByLabelText("Название курса"), {
      target: { value: "Черновик" }
    });

    await userEvent.click(screen.getByRole("link", { name: "← Все курсы" }));
    expect(
      screen.getByRole("heading", { name: "Выйти из редактора?" })
    ).toBeInTheDocument();
    await userEvent.click(button("Остаться в редакторе"));
    expect(router.push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("link", { name: "← Все курсы" }));
    await userEvent.click(button("Выйти без сохранения"));
    expect(router.push).toHaveBeenCalledWith("/studio");
  });

  it("discards edits and reloads the saved draft after confirmation", async () => {
    routes({ [coursePath]: [draft, draft] });
    renderEditor();
    fireEvent.change(await screen.findByLabelText("Название курса"), {
      target: { value: "Черновик" }
    });
    await userEvent.click(
      button("Отбросить изменения и загрузить сохранённое")
    );
    await userEvent.click(button("Отбросить и загрузить"));

    expect(
      await screen.findByText("Загружен актуальный черновик.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Название курса")).toHaveValue("HTML с нуля");
  });

  it("loads a JSON file into the working copy and refuses one over 900 KB", async () => {
    routes({ [coursePath]: [draft] });
    renderEditor();
    await userEvent.click(await screen.findByRole("button", { name: "JSON" }));
    const input = screen.getByLabelText("Загрузить JSON-файл");
    const edited = {
      ...draft.manifest,
      course: { ...draft.manifest.course, title: "Из файла" }
    };
    await userEvent.upload(
      input,
      new File([JSON.stringify(edited)], "course.json", {
        type: "application/json"
      })
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Manifest JSON")).toHaveValue(
        JSON.stringify(edited)
      );
    });

    await userEvent.upload(
      input,
      new File(["x".repeat(900001)], "big.json", { type: "application/json" })
    );
    expect(
      await screen.findByText("JSON-файл должен быть не больше 900 КБ.")
    ).toBeInTheDocument();
  });

  it("downloads the working copy and the saved draft", async () => {
    routes({
      [coursePath]: [draft],
      [`${base}/courses/${draft.courseId}/versions/${draft.versionId}/manifest`]:
        [manifest()]
    });
    renderEditor();
    await userEvent.click(
      await screen.findByRole("button", { name: "Скачать рабочую копию" })
    );
    expect(downloadManifest).toHaveBeenLastCalledWith(draft.manifest, "html");
    await userEvent.click(button("Скачать сохранённый JSON"));
    expect(
      await screen.findByText("Скачан сохранённый черновик.")
    ).toBeInTheDocument();
  });
});
