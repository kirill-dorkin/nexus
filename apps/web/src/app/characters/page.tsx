import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, Heading, Text, buttonClass } from "@platform/ui";

import { LearningShell } from "../../components/learning/learning-shell";
import { CharacterRoster } from "../../components/characters/character-roster";
import { UpcomingCharacters } from "../../components/characters/upcoming-characters";
import styles from "../../components/characters/characters.module.css";

export const metadata: Metadata = {
  title: "Персонажи",
  description:
    "Каждая технология — персонаж, которого вы прокачиваете: изучаете навык, подтверждаете его тестом и повторяете, чтобы не забыть."
};

export default function CharactersPage() {
  return (
    <LearningShell>
      <div className={styles.intro}>
        <Eyebrow>Прокачка</Eyebrow>
        <Heading level={1} size="display">
          Персонажи
        </Heading>
        <Text muted>
          Каждая технология — персонаж. Его навыки — все её возможности. Навык
          засчитывается, когда вы изучили урок и подтвердили понимание тестом.
          Без повторения навык тускнеет и забывается, а уровень персонажа
          снижается.
        </Text>
        <Link className={buttonClass({ variant: "secondary" })} href="/map">
          Карта города
        </Link>
      </div>
      <CharacterRoster />
      <UpcomingCharacters />
    </LearningShell>
  );
}
