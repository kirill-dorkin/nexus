import { describe, expect, it } from "vitest";

import { formatMoney, perMonth } from "./subscription-format";

const space = (value: string) => value.replace(/\s/g, " ");

describe("subscription prices", () => {
  it("shows roubles without kopecks and dollars with cents", () => {
    expect(space(formatMoney(99000, "RUB"))).toBe("990 ₽");
    expect(space(formatMoney(690000, "RUB"))).toBe("6 900 ₽");
    expect(space(formatMoney(1199, "USD"))).toBe("11,99 $");
  });

  it("gives the monthly equivalent of longer periods", () => {
    expect(space(perMonth(690000, "RUB", "year"))).toBe("575 ₽");
    expect(space(perMonth(249000, "RUB", "days_90"))).toBe("830 ₽");
  });
});
