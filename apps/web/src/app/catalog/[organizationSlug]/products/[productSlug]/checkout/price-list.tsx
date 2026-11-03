import type { PublicCatalogPrice } from "@platform/contracts";
import styles from "../product.module.css";

export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency }).format(
    amountMinor / 100
  );
}

/** One radio per active price of the product. */
export function PriceList({
  prices,
  selected,
  disabled,
  onSelect
}: {
  prices: readonly PublicCatalogPrice[];
  selected: string;
  disabled: boolean;
  onSelect: (priceId: string) => void;
}) {
  return (
    <fieldset className={styles.priceList} disabled={disabled}>
      <legend className={styles.eyebrow}>Доступные варианты</legend>
      {prices.map((price) => (
        <label className={styles.priceOption} key={price.id}>
          <input
            type="radio"
            name="price"
            value={price.id}
            checked={selected === price.id}
            onChange={() => onSelect(price.id)}
          />
          <span>
            <span className={styles.priceValue}>
              {formatMoney(price.amountMinor, price.currency)}
            </span>
            <span className={styles.hint}>Разовая оплата</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
