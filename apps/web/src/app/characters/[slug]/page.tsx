import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LearningShell } from "../../../components/learning/learning-shell";
import { CharacterProfile } from "../../../components/characters/character-profile";
import { SKILL_MAP, findCharacter } from "../../../lib/skill-map/skill-map";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SKILL_MAP.characters.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const character = findCharacter((await params).slug);
  if (!character) return {};
  return {
    title: `${character.name} — ${character.role}`,
    description: character.summary
  };
}

export default async function CharacterPage({ params }: Props) {
  const character = findCharacter((await params).slug);
  if (!character) notFound();
  return (
    <LearningShell>
      <CharacterProfile character={character} />
    </LearningShell>
  );
}
