"use client";
import { useEffect, useRef, useState } from "react";
import {
  createLearningOfferingRequestSchema,
  learningOfferingSchema,
  type LearningOffering
} from "@platform/contracts";
import { browserApiRequest } from "../../../lib/public-api";
import { StudioError, studioRequest } from "../studio-api";
import {
  loadAccess,
  offeringPage,
  offeringsPath,
  requestError,
  type AccessState
} from "./load-access";

const VISIBILITY_ERRORS: Readonly<Record<number, string>> = {
  401: "Войдите в Studio.",
  403: "Недостаточно прав на изменение видимости.",
  409: "Состояние курса изменилось. Обновите список."
};

/**
 * Offerings of one course: loading, paging, creating a private offering and
 * changing visibility. A command whose result is unknown locks further
 * commands ("uncertain") until the list is reloaded.
 */
export function useOfferings(organizationId: string, courseId: string) {
  const path = offeringsPath(organizationId);
  const [access, setAccess] = useState<AccessState | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [confirmPublicId, setConfirmPublicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inFlight = useRef(false);

  function install(state: AccessState) {
    setAccess(state);
    setName(state.course.manifest.course.title);
    setSlug(state.course.slug);
    setConfirmPublicId(null);
    setUncertain(false);
  }
  function fail(e: unknown) {
    setLogin(e instanceof StudioError && e.status === 401);
    setError(requestError(e));
  }

  useEffect(() => {
    // The route changes by remounting this keyed component.
    let cancelled = false;
    loadAccess(organizationId, courseId)
      .then((state) => {
        if (!cancelled) install(state);
      })
      .catch((e: unknown) => {
        if (!cancelled) fail(e);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, courseId]);

  async function run(action: () => Promise<void>, mayHaveCommitted = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      if (mayHaveCommitted) setUncertain(true);
      fail(e);
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  const course = access?.course ?? null;
  const published = course?.status === "published" ? course : null;

  async function reload() {
    await run(async () => {
      install(await loadAccess(organizationId, courseId));
      setMessage("Загружены актуальные настройки доступа.");
    });
  }

  async function more() {
    if (!published || !access?.cursor) return;
    const { offerings, cursor } = access;
    await run(async () => {
      const next = await offeringPage(
        organizationId,
        published.versionId,
        offerings,
        cursor
      );
      setAccess({ ...access, ...next });
    });
  }

  async function create() {
    if (!published || !access || uncertain) return;
    const parsed = createLearningOfferingRequestSchema.safeParse({
      courseVersionId: published.versionId,
      name: name.trim(),
      slug: slug.trim(),
      deliveryMode: "self_paced",
      accessMode: "membership"
    });
    if (!parsed.success) {
      setError(
        "Проверьте название и адрес: slug должен состоять из строчных латинских букв, цифр и дефисов."
      );
      return;
    }
    if (access.offerings.some((item) => item.slug === parsed.data.slug)) {
      setError("Offering с таким адресом уже есть. Используйте существующий.");
      return;
    }
    await run(async () => {
      // A successful create is always private. Publishing is a distinct action.
      const created = learningOfferingSchema.parse(
        await studioRequest(path, parsed.data)
      );
      if (
        created.courseVersionId !== published.versionId ||
        created.organizationId !== organizationId ||
        created.visibility !== "private"
      )
        throw new Error(
          "Получен неожиданный ответ сервера. Обновите список перед повтором."
        );
      install(await loadAccess(organizationId, courseId));
      setMessage(
        "Доступ создан приватным. Проверьте настройки и откройте его отдельной кнопкой."
      );
    }, true);
  }

  async function changeVisibility(
    offering: LearningOffering,
    visibility: "public" | "private"
  ) {
    if (offering.courseVersionId !== published?.versionId || uncertain) return;
    if (visibility === "public" && confirmPublicId !== offering.id) return;
    await run(async () => {
      const response = await browserApiRequest(
        `/v1/${path}/${offering.id}/visibility`,
        { method: "PATCH", body: JSON.stringify({ visibility }) }
      );
      if (!response.ok)
        throw new StudioError(
          response.status,
          VISIBILITY_ERRORS[response.status] ??
            "Не удалось проверить изменение видимости. Обновите список перед повтором."
        );
      const updated = learningOfferingSchema.parse(await response.json());
      if (
        updated.id !== offering.id ||
        updated.courseVersionId !== published.versionId ||
        updated.organizationId !== organizationId ||
        updated.visibility !== visibility
      )
        throw new Error(
          "Сервер вернул неожиданное состояние. Обновите список."
        );
      setAccess(
        (previous) =>
          previous && {
            ...previous,
            offerings: previous.offerings.map((item) =>
              item.id === updated.id ? updated : item
            )
          }
      );
      setConfirmPublicId(null);
      setMessage(
        visibility === "public"
          ? "Публичный доступ включён."
          : "Публичный доступ скрыт."
      );
    }, true);
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Ссылка скопирована.");
    } catch {
      setMessage(
        "Не удалось скопировать автоматически. Выделите ссылку на странице."
      );
    }
  }

  return {
    access,
    course,
    name,
    slug,
    ready,
    busy,
    login,
    uncertain,
    confirmPublicId,
    error,
    message,
    setName,
    setSlug,
    setConfirmPublicId,
    reload,
    more,
    create,
    changeVisibility,
    copyLink
  };
}

export type Offerings = ReturnType<typeof useOfferings>;
