import { describe, expect, it } from "vitest";

import { ownSkillRecordsParser, ownSkillsPath, utcToday } from "./own-skills";

describe("own skill records", () => {
  it("keeps confirmation days per skill key and drops malformed entries", () => {
    const records = ownSkillRecordsParser.parse({
      skills: [
        { skillKey: "html-elements", confirmedDays: ["2026-11-01", "bad", 3] },
        { skillKey: "css-what", confirmedDays: [] },
        { skillKey: 5, confirmedDays: ["2026-11-01"] },
        { confirmedDays: ["2026-11-01"] },
        null
      ]
    });
    expect([...records.keys()]).toEqual(["html-elements", "css-what"]);
    expect(records.get("html-elements")?.confirmedDays).toEqual(["2026-11-01"]);
  });

  it("refuses a response without a skills list", () => {
    expect(() => ownSkillRecordsParser.parse({})).toThrow();
    expect(() => ownSkillRecordsParser.parse(null)).toThrow();
  });

  it("reads the home organization and the UTC day", () => {
    expect(ownSkillsPath()).toBe("/v1/me/skills/nexus");
    expect(utcToday(new Date("2026-11-05T23:30:00-05:00"))).toBe("2026-11-06");
  });
});
