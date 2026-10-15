import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const panel = readFileSync(new URL("./checkout-panel.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./product.module.css", import.meta.url), "utf8");

const designTokens = readFileSync(
  new URL("../../../../../../../../packages/design-tokens/tokens.css", import.meta.url),
  "utf8"
);

describe("mobile-first commerce Product decision", () => {
  it("resolves every mobile spacing token from the actual design system", () => {
    const defined = new Set(
      [...designTokens.matchAll(/--(space-\d+)\s*:/g)].map((match) => match[1])
    );
    const used = [...styles.matchAll(/var\(--(space-\d+)\)/g)].map((match) => match[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const token of used) {
      expect(defined.has(token), `Undefined spacing token: --${token}`).toBe(true);
    }
    expect(styles).not.toContain("var(--space-5)");
  });

  it("puts the price and next action first in reading and keyboard order", () => {
    const checkout = page.indexOf("<CheckoutPanel catalog={catalog} />");
    const details = page.indexOf("<section className={styles.details}");
    expect(checkout).toBeGreaterThan(0);
    expect(details).toBeGreaterThan(checkout);
    expect(page.match(/<CheckoutPanel catalog=\{catalog\} \/>/g)).toHaveLength(1);
    expect(styles).toMatch(/\.checkoutCard\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1;/s);
    expect(styles).toMatch(/@media\s*\(max-width:\s*52rem\)[\s\S]*?\.checkoutCard\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1;/);
    expect(styles).toMatch(/@media\s*\(max-width:\s*52rem\)[\s\S]*?\.details\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*2;/);
  });

  it("displays an exact server-derived price without visually merging its terms", () => {
    expect(panel).toContain("formatMoney(price.amountMinor, price.currency)");
    expect(panel).toContain("catalog.product.prices.length === 1");
    expect(panel).toContain("Стоимость курса");
    expect(panel).toContain("styles.priceDetails");
    expect(styles).toMatch(/\.priceDetails\s*\{[^}]*display:\s*grid;[^}]*gap:/s);
    expect(panel).toContain('name="price"');
    expect(panel).toContain("checked={selectedPriceId === price.id}");
  });

  it("preserves canonical checkout authority and explicit opt-in", () => {
    expect(panel).toContain("const fresh = await currentProduct()");
    expect(panel).toContain("selectedPrice.id");
    expect(panel).toContain("idempotencyKey");
    expect(panel).toContain('customerEntryPolicy === "open"');
    expect(panel).toContain("handleCheckout");
    expect(page).toContain("Условия покупки");
  });
});
