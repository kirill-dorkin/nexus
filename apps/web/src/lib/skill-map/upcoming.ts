/**
 * Characters announced in the roster of the characters spec (section 3.2) that have no skills
 * yet. Shown as «Скоро» so learners see where the city grows; each becomes a real character when
 * its course is built with full coverage and published.
 */
export type UpcomingCharacter = {
  name: string;
  role: string;
  /** What the character stands on (names of existing or upcoming characters). */
  needs: string;
};

export type UpcomingDistrict = {
  district: string;
  characters: UpcomingCharacter[];
};

export const UPCOMING: UpcomingDistrict[] = [
  {
    district: "Мастерские фреймворков",
    characters: [
      { name: "Angular", role: "Инженер платформы", needs: "TypeScript" },
      { name: "Svelte", role: "Компилятор", needs: "JavaScript" }
    ]
  },
  {
    district: "Башни мета-фреймворков",
    characters: [
      { name: "Nuxt", role: "Архитектор Vue", needs: "Vue" },
      { name: "SvelteKit", role: "Архитектор Svelte", needs: "Svelte" },
      { name: "Astro", role: "Строитель островов", needs: "HTML, JavaScript" }
    ]
  },
  {
    district: "Сервер",
    characters: [
      {
        name: "NestJS",
        role: "Командир модулей",
        needs: "Node.js, TypeScript"
      }
    ]
  },
  {
    district: "Архив",
    characters: [
      { name: "MongoDB", role: "Хранитель документов", needs: "JavaScript" },
      { name: "Redis", role: "Быстрая память", needs: "Сеть и HTTP" },
      { name: "Prisma", role: "Переводчик схем", needs: "SQL, TypeScript" }
    ]
  },
  {
    district: "Испытательный полигон",
    characters: [
      { name: "Vitest", role: "Испытатель", needs: "JavaScript" },
      {
        name: "Playwright",
        role: "Робот-тестировщик",
        needs: "Браузер, JavaScript"
      }
    ]
  }
];
