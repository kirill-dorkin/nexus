"use client";
import Link from "next/link";

import { cityPlan, type DistrictState } from "../../lib/skill-map/city";
import { useOwnSkillRecords, utcToday } from "../../lib/skill-map/own-skills";
import { initials } from "./character-roster";
import styles from "./characters.module.css";

const stateLabel: Record<DistrictState, string> = {
  ruined: "разрушен",
  scaffolding: "в лесах",
  alive: "жив"
};

/** The city plan: districts by character, roads between them, the look follows active skills. */
export function CityMap() {
  const { status, records } = useOwnSkillRecords();
  const { districts, roads } = cityPlan(records, utcToday());
  const at = new Map(districts.map((d) => [d.character.slug, d]));
  return (
    <div className={styles.city} aria-busy={status === "loading"}>
      <svg
        className={styles.cityPlan}
        viewBox="0 0 1000 620"
        role="group"
        aria-label="Карта города Нексус"
      >
        <defs>
          <pattern
            id="scaffold"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="12" height="12" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="12" className={styles.hatch} />
          </pattern>
        </defs>
        <g aria-hidden="true">
          {roads.map((road) => {
            const a = at.get(road.from);
            const b = at.get(road.to);
            return a && b ? (
              <line
                key={`${road.from}-${road.to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={styles.road}
              />
            ) : null;
          })}
        </g>
        {districts.map((district) => (
          <Link
            key={district.character.slug}
            href={`/characters/${district.character.slug}`}
            aria-label={`${district.name}, персонаж ${district.character.name}: уровень ${district.level}, район ${stateLabel[district.state]}`}
          >
            <g
              className={styles.district}
              data-state={district.state}
              data-ui-accent={district.character.accent}
              transform={`translate(${district.x} ${district.y})`}
            >
              <rect
                x="-110"
                y="-62"
                width="220"
                height="124"
                rx="18"
                className={styles.districtBase}
              />
              {district.state === "scaffolding" && (
                <rect
                  x="-110"
                  y="-62"
                  width="220"
                  height="124"
                  rx="18"
                  fill="url(#scaffold)"
                />
              )}
              <circle
                r="22"
                cx="-72"
                cy="-24"
                className={styles.districtBadge}
              />
              <text
                x="-72"
                y="-18"
                textAnchor="middle"
                className={styles.districtInitials}
              >
                {initials(district.character)}
              </text>
              <text x="-40" y="-26" className={styles.districtName}>
                {district.name}
              </text>
              <text x="-40" y="-4" className={styles.districtMeta}>
                {district.character.name} · ур. {district.level}
              </text>
              <text x="-92" y="40" className={styles.districtMeta}>
                {stateLabel[district.state]}
              </text>
            </g>
          </Link>
        ))}
      </svg>
    </div>
  );
}
