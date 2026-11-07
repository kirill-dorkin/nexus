import { describe, expect, it } from "vitest";

import { conceptKind, parseConcept, parseRecap, parseStory } from "./model";

const concept = {
  name: "fetch",
  title: "Запрос",
  what: "Отправляет запрос.",
  why: "Чтобы получить данные."
};
const asJson = (value: unknown) => JSON.stringify(value);

describe("lesson block parsers", () => {
  it("parses a story and rejects broken ones", () => {
    expect(
      parseStory(asJson({ title: "Утро", lines: [["nika", "Привет"]] }))
    ).toEqual({ title: "Утро", lines: [{ who: "nika", text: "Привет" }] });
    expect(
      parseStory(asJson({ lines: [["nika", "Без заголовка"]] }))?.title
    ).toBe(undefined);
    expect(parseStory("not json")).toBeNull();
    expect(parseStory("42")).toBeNull();
    expect(parseStory(asJson({ lines: [] }))).toBeNull();
    expect(parseStory(asJson({ lines: [["stranger", "кто я"]] }))).toBeNull();
    expect(parseStory(asJson({ lines: [["nika"]] }))).toBeNull();
    expect(
      parseStory(asJson({ lines: Array(15).fill(["nika", "a"]) }))
    ).toBeNull();
  });

  it("parses a concept with optional fields and rejects invalid ones", () => {
    expect(parseConcept(asJson(concept))?.name).toBe("fetch");
    expect(
      parseConcept(
        asJson({
          ...concept,
          how: "fetch(url)",
          lang: "js",
          show: 80,
          kind: "method",
          page: "<p></p>"
        })
      )
    ).toMatchObject({ lang: "js", show: 80, kind: "method", page: "<p></p>" });
    expect(parseConcept(asJson({ ...concept, name: "" }))).toBeNull();
    expect(parseConcept(asJson({ ...concept, how: 5 }))).toBeNull();
    expect(parseConcept(asJson({ ...concept, bro: 5 }))).toBeNull();
    expect(
      parseConcept(asJson({ ...concept, page: "<p></p>", lang: "css" }))
    ).toBeNull();
    expect(
      parseConcept(asJson({ ...concept, lang: "Java Script" }))
    ).toBeNull();
    expect(parseConcept(asJson({ ...concept, kind: "nonsense" }))).toBeNull();
    expect(parseConcept(asJson({ ...concept, show: 10 }))).toBeNull();
    expect(parseConcept(asJson({ ...concept, show: 1.5 }))).toBeNull();
    expect(parseConcept("{")).toBeNull();
  });

  it("tells tags, attributes and ideas apart", () => {
    expect(conceptKind("<p>")).toBe("tag");
    expect(conceptKind("href")).toBe("attr");
    expect(conceptKind("aria-label=")).toBe("attr");
    expect(conceptKind("Сервер")).toBe("idea");
  });

  it("parses a recap and keeps only a valid cast", () => {
    expect(
      parseRecap(asJson({ now: "Начинаем", premise: "Город", cast: ["nika"] }))
    ).toEqual({
      now: "Начинаем",
      premise: "Город",
      cast: ["nika"]
    });
    expect(
      parseRecap(asJson({ now: "Начинаем", cast: ["stranger"] }))?.cast
    ).toBeUndefined();
    expect(
      parseRecap(asJson({ now: "Начинаем", cast: "nika" }))?.cast
    ).toBeUndefined();
    expect(parseRecap(asJson({ premise: "нет now" }))).toBeNull();
  });
});
