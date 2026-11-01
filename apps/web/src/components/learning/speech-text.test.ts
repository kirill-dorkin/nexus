import { describe, expect, it } from "vitest";
import { lineId, spokenText } from "./speech-text";

describe("speech text", () => {
  it("makes code and Latin pronounceable in Russian", () => {
    expect(spokenText("Видишь `<h1>` — главный заголовок")).toBe("Видишь тег эйч один — главный заголовок");
    expect(spokenText("файл сохранён как `.txt`")).toBe("файл сохранён как точка ти-икс-ти");
    expect(spokenText("Пиши **HTML** 🤖")).toBe("Пиши эйч-ти-эм-эль");
    expect(spokenText("Атрибут `href=\"/menu\"`")).toBe("Атрибут эйч-реф мену");
  });
  it("gives every line a stable short id", () => {
    expect(lineId("bro", "Привет")).toBe(lineId("bro", "Привет"));
    expect(lineId("bro", "Привет")).not.toBe(lineId("lev", "Привет"));
    expect(lineId("bro", "Привет")).toMatch(/^[0-9a-f]{8}$/);
  });
});
