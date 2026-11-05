"use client";

import {
  feedbackReportListSchema,
  feedbackReportSchema,
  type FeedbackReport,
  type FeedbackStatus
} from "@platform/contracts";
import { Alert, Button, EmptyState, Heading, Select, Text } from "@platform/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { browserApiRequest } from "../../lib/public-api";
import { StudioError, studioRequest } from "./studio-api";
import styles from "./studio.module.css";

const KIND_LABEL: Record<FeedbackReport["kind"], string> = {
  problem: "Не работает",
  unclear: "Непонятно",
  idea: "Идея"
};

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "Новое",
  accepted: "Принято в работу",
  duplicate: "Повтор",
  rejected: "Отклонено",
  done: "Сделано"
};
const STATUSES = Object.keys(STATUS_LABEL) as FeedbackStatus[];

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short"
});

function failure(error: unknown): string {
  if (error instanceof StudioError && error.status === 403)
    return "Отзывы видят только владелец и администраторы организации.";
  return error instanceof Error ? error.message : "Запрос не завершился.";
}

function pageLabel(report: FeedbackReport) {
  if (report.courseSlug && report.lessonSlug)
    return (
      <Link href={`/courses/${report.courseSlug}/${report.lessonSlug}`}>
        Урок {report.courseSlug}/{report.lessonSlug}
      </Link>
    );
  if (report.courseSlug)
    return (
      <Link href={`/courses/${report.courseSlug}`}>
        Курс {report.courseSlug}
      </Link>
    );
  return (
    <span>Страница {report.route === "other" ? "другая" : report.route}</span>
  );
}

/** Learner reports of one Organization with their status (ADR-0085). */
export function FeedbackInbox({ organizationId }: { organizationId: string }) {
  const [filter, setFilter] = useState<FeedbackStatus | "all">("new");
  const [reports, setReports] = useState<FeedbackReport[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (after: string | null) => {
      const query = new URLSearchParams();
      if (filter !== "all") query.set("status", filter);
      if (after) query.set("after", after);
      return feedbackReportListSchema.parse(
        await studioRequest(
          `organizations/${organizationId}/feedback?${query.toString()}`
        )
      );
    },
    [filter, organizationId]
  );

  useEffect(() => {
    let cancelled = false;
    async function initial() {
      try {
        const page = await fetchPage(null);
        if (cancelled) return;
        setReports(page.reports);
        setNext(page.nextCursor);
      } catch (e) {
        if (!cancelled) setError(failure(e));
      }
    }
    void initial();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  async function more(after: string) {
    try {
      const page = await fetchPage(after);
      setReports((current) => [...(current ?? []), ...page.reports]);
      setNext(page.nextCursor);
    } catch (e) {
      setError(failure(e));
    }
  }

  async function changeStatus(report: FeedbackReport, status: FeedbackStatus) {
    setSaving(report.id);
    setError(null);
    try {
      const response = await browserApiRequest(
        `/v1/organizations/${organizationId}/feedback/${report.id}`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      );
      if (!response.ok)
        throw new StudioError(response.status, "Статус не сохранился.");
      const updated = feedbackReportSchema.parse(await response.json());
      setReports((current) =>
        (current ?? []).map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (e) {
      setError(failure(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className={styles.feedbackInbox} aria-labelledby="feedback-title">
      <Heading level={1} size="section" id="feedback-title">
        Отзывы учеников
      </Heading>
      <Text muted>
        Сообщения с кнопки «Сообщить» на страницах курсов. Видно страницу и
        версию сайта, на которой ученик был.
      </Text>
      <label className={styles.feedbackFilter}>
        Показать
        <Select
          value={filter}
          onChange={(event) => {
            setReports(null);
            setError(null);
            setFilter(event.target.value as FeedbackStatus | "all");
          }}
        >
          <option value="all">Все</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
      </label>
      {error && <Alert tone="danger">{error}</Alert>}
      {reports === null && !error && <Text muted>Загружаем отзывы…</Text>}
      {reports?.length === 0 && (
        <EmptyState title="Сообщений нет">
          Когда ученики нажмут «Сообщить», сообщения появятся здесь.
        </EmptyState>
      )}
      <ul className={styles.feedbackList}>
        {reports?.map((report) => (
          <li key={report.id} className={styles.feedbackItem}>
            <p className={styles.feedbackMeta}>
              <strong>{KIND_LABEL[report.kind]}</strong>
              <span>{dateFormat.format(new Date(report.createdAt))}</span>
              {pageLabel(report)}
              <span>
                {report.signedIn ? "ученик вошёл" : "без входа"}
                {report.device === "mobile" ? " · телефон" : ""} · версия{" "}
                {report.release}
              </span>
            </p>
            <p className={styles.feedbackText}>{report.text}</p>
            {report.expected && (
              <p>
                <strong>Ожидал:</strong> {report.expected}
              </p>
            )}
            {report.actual && (
              <p>
                <strong>Произошло:</strong> {report.actual}
              </p>
            )}
            <label className={styles.feedbackFilter}>
              Статус
              <Select
                value={report.status}
                disabled={saving === report.id}
                onChange={(event) =>
                  void changeStatus(
                    report,
                    event.target.value as FeedbackStatus
                  )
                }
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </label>
          </li>
        ))}
      </ul>
      {next && (
        <Button variant="secondary" onClick={() => void more(next)}>
          Показать ещё
        </Button>
      )}
    </section>
  );
}
