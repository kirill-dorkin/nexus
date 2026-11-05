import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, Heading, Text, buttonClass } from "@platform/ui";

import { LearningShell } from "../../components/learning/learning-shell";
import { CityMap } from "../../components/characters/city-map";
import styles from "../../components/characters/characters.module.css";
import { loadSkillMap } from "../../lib/skill-map/load-skill-map";

export const metadata: Metadata = {
  title: "Карта города",
  description:
    "Город Нексус: районы-персонажи оживают, когда вы подтверждаете их навыки."
};

export default async function MapPage() {
  const map = await loadSkillMap();
  return (
    <LearningShell width="full">
      <div className={styles.intro}>
        <Eyebrow>Нексус</Eyebrow>
        <Heading level={1} size="display">
          Карта города
        </Heading>
        <Text muted>
          Город построен из кода и разваливается. У каждого района есть
          хранитель — персонаж-технология. Подтверждайте его навыки, и район из
          руин встанет в леса, а затем оживёт. Дороги ведут туда, где персонаж
          опирается на другого.
        </Text>
        <Link
          className={buttonClass({ variant: "secondary" })}
          href="/characters"
        >
          Все персонажи
        </Link>
      </div>
      <CityMap map={map} />
    </LearningShell>
  );
}
