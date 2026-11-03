"use client";
import { useMemo, type ReactNode } from "react";
import { ConceptCard } from "./story/concept-card";
import { parseConcept, parseRecap, parseStory } from "./story/model";
import { RecapBanner } from "./story/recap-banner";
import { StoryScene } from "./story/story-scene";

export {
  CHARACTERS,
  conceptKind,
  parseConcept,
  parseRecap,
  parseStory,
  type Concept,
  type ConceptKind,
  type Story,
  type Who
} from "./story/model";
export { Rich } from "./story/rich";

export function RecapFence({
  source,
  fallback
}: {
  source: string;
  fallback: ReactNode;
}) {
  const recap = useMemo(() => parseRecap(source), [source]);
  return recap ? <RecapBanner recap={recap} /> : <>{fallback}</>;
}

export function StoryFence({
  source,
  fallback
}: {
  source: string;
  fallback: ReactNode;
}) {
  const story = useMemo(() => parseStory(source), [source]);
  return story ? <StoryScene story={story} /> : <>{fallback}</>;
}
export function ConceptFence({
  source,
  fallback
}: {
  source: string;
  fallback: ReactNode;
}) {
  const concept = useMemo(() => parseConcept(source), [source]);
  return concept ? <ConceptCard concept={concept} /> : <>{fallback}</>;
}
