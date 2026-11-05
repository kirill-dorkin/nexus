import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LearningShell } from "../../../components/learning/learning-shell";
import { CharacterProfile } from "../../../components/characters/character-profile";
import { findCharacter } from "../../../lib/skill-map/skill-map";
import { loadSkillMap } from "../../../lib/skill-map/load-skill-map";
import { scenesFor } from "../../../lib/skill-map/story";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await loadSkillMap()).characters.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const character = findCharacter((await params).slug, await loadSkillMap());
  if (!character) return {};
  return {
    title: `${character.name} — ${character.role}`,
    description: character.summary
  };
}

export default async function CharacterPage({ params }: Props) {
  const map = await loadSkillMap();
  const character = findCharacter((await params).slug, map);
  if (!character) notFound();
  return (
    <LearningShell>
      <CharacterProfile
        character={character}
        map={map}
        scenes={scenesFor(character.branches.map((b) => b.id))}
      />
    </LearningShell>
  );
}
