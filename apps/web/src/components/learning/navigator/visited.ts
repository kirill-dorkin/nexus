"use client";
import { useEffect, useMemo } from "react";
import { brand } from "@platform/brand";
import {
  useStoredValue,
  writeStoredValue
} from "../../../lib/hooks/stored-value";

export type ProgramItem = {
  slug: string;
  title: string;
  chapter?: string | null | undefined;
  minutes: number;
  href: string;
};

const norm = (s: string) => s.toLocaleLowerCase("ru").replace(/ё/g, "е").trim();

/** Lessons whose title matches every word of the query (case- and ё-insensitive). */
export function matchesQuery(
  item: Pick<ProgramItem, "title" | "chapter">,
  query: string
): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = norm(`${item.title} ${item.chapter ?? ""}`);
  return words.every((w) => text.includes(w));
}

function visitedKey(course: string) {
  return `${brand.slug}:visited:${course}`;
}

function visitedList(raw: string | null): readonly string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? (value as unknown[]).filter(
          (slug): slug is string => typeof slug === "string"
        )
      : [];
  } catch {
    return [];
  }
}

/** Remembers which lessons this browser has opened. Never blocks rendering when storage is unavailable. */
export function useVisited(
  course: string,
  current: string
): ReadonlySet<string> {
  const key = visitedKey(course);
  const raw = useStoredValue(key);
  const stored = useMemo(() => visitedList(raw), [raw]);
  useEffect(() => {
    if (!stored.includes(current))
      writeStoredValue(key, JSON.stringify([...stored, current]));
  }, [key, current, stored]);
  return useMemo(() => new Set([...stored, current]), [stored, current]);
}
