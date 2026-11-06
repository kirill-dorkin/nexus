"use client";
import { useEffect, useRef, useState } from "react";
import type { Stage } from "./three/stage";
import type { PortraitRequest } from "./three/portraits";
import type { CSSProperties } from "react";
import { RANKS } from "../../lib/skill-map/skill-map";
import { characterDef, hasBody } from "./three/roster";
import { rankIndex } from "./three/types";

/** The site's own rank titles; the five looks change at the same levels (0, 20, 40, 60, 80). */
const LOOKS = RANKS.slice(0, 5);

/** The character's own colours for the stage and portrait backgrounds. */
export function stageColours(slug: string): CSSProperties | undefined {
  const def = characterDef(slug);
  if (!def) return undefined;
  return {
    "--stage-glow": def.ui[0],
    "--stage-deep": def.ui[3]
  } as CSSProperties;
}
import styles from "./character-stage.module.css";

/** True where the browser can draw WebGL; false in tests and on devices without a GPU. */
export function canDraw3d(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined")
    return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The live 3D character on its page. three.js loads only here, after the page is shown,
 * so course pages stay light. The canvas is decorative: level and rank stay in text.
 */
export function CharacterStage({
  slug,
  level
}: {
  slug: string;
  /** 0–100. */
  level: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [ready, setReady] = useState(false);
  /** A rank the viewer is previewing; null shows their own level. */
  const [preview, setPreview] = useState<number | null>(null);
  const enabled = hasBody(slug);
  const shownLevel =
    preview === null ? level : (LOOKS[preview]?.from ?? 0) + 12;

  useEffect(() => {
    const el = host.current;
    if (!enabled || !el || !canDraw3d()) return;
    let cancelled = false;
    void import("./three/stage").then(({ createStage }) => {
      if (cancelled) return;
      const created = createStage(el, reducedMotion());
      created.show(slug);
      stage.current = created;
      setReady(true);
    });
    return () => {
      cancelled = true;
      stage.current?.dispose();
      stage.current = null;
    };
  }, [enabled, slug]);

  useEffect(() => {
    if (ready) stage.current?.setLevel(shownLevel);
  }, [ready, shownLevel]);

  if (!enabled) return null;
  const own = rankIndex(level);
  return (
    <div className={styles.wrap} style={stageColours(slug)}>
      <div
        ref={host}
        className={styles.stage}
        data-ready={ready || undefined}
        aria-hidden="true"
      >
        <span className={styles.hint}>Потяните, чтобы повернуть</span>
      </div>
      {ready && (
        <div
          className={styles.ranks}
          role="group"
          aria-label="Как персонаж выглядит на каждом ранге"
        >
          <button
            type="button"
            aria-pressed={preview === null}
            onClick={() => setPreview(null)}
          >
            Мой уровень
          </button>
          {LOOKS.map(({ title: name }, i) => (
            <button
              key={name}
              type="button"
              aria-pressed={preview === i}
              data-own={i === own || undefined}
              onClick={() => setPreview(i)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Still images of the characters at the learner's levels, drawn once in the browser.
 * Empty until drawn, and stays empty where WebGL is unavailable (cards keep their initials).
 */
export function usePortraits(
  requests: readonly PortraitRequest[]
): Readonly<Record<string, string>> {
  const [images, setImages] = useState<Readonly<Record<string, string>>>({});
  const key = requests.map((r) => `${r.slug}:${Math.round(r.level)}`).join(",");
  useEffect(() => {
    if (!key || !canDraw3d()) return;
    let cancelled = false;
    const wanted = key.split(",").map((part) => {
      const [slug = "", level = "0"] = part.split(":");
      return { slug, level: Number(level) };
    });
    void import("./three/portraits").then(({ renderPortraits }) => {
      if (!cancelled) setImages(renderPortraits(wanted));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return images;
}
