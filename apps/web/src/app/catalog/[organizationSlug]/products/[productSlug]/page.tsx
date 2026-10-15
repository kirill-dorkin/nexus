import {
  publicCatalogProductResponseSchema,
  type PublicCatalogProductResponse
} from "@platform/contracts";
import { notFound } from "next/navigation";

import { serverApiUrl } from "../../../../../lib/server-api";
import { CheckoutPanel } from "./checkout-panel";
import styles from "./product.module.css";

export const dynamic = "force-dynamic";

type PublicProductPageProps = Readonly<{
  params: Promise<{
    organizationSlug: string;
    productSlug: string;
  }>;
}>;

async function loadProduct(
  organizationSlug: string,
  productSlug: string
): Promise<PublicCatalogProductResponse> {
  const response = await fetch(
    serverApiUrl(
      `/v1/public/catalog/${encodeURIComponent(organizationSlug)}/products/${encodeURIComponent(productSlug)}`
    ),
    { cache: "no-store" }
  );

  if (response.status === 404) {
    notFound();
  }
  if (!response.ok) {
    throw new Error(`Public catalog request failed with status ${response.status}.`);
  }
  return publicCatalogProductResponseSchema.parse(await response.json());
}

function deliveryLabel(mode: string): string {
  switch (mode) {
    case "self_paced":
      return "В своём темпе";
    case "cohort":
      return "Поток";
    case "instructor_led":
      return "С преподавателем";
    case "blended":
      return "Смешанный формат";
    default:
      return mode;
  }
}

function dateLabel(value: string | null): string {
  if (value === null) return "Без фиксированной даты";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long"
  }).format(new Date(value));
}

export default async function PublicProductPage({ params }: PublicProductPageProps) {
  const { organizationSlug, productSlug } = await params;
  const catalog = await loadProduct(organizationSlug, productSlug);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{catalog.organization.name}</p>
        <h1 className={styles.title}>{catalog.product.name}</h1>
        <p className={styles.lead}>
          {catalog.product.offering.name}. Выберите подходящий вариант оплаты,
          затем войдите или создайте аккаунт, чтобы продолжить.
        </p>
      </header>

      <div className={styles.layout}>
        <CheckoutPanel catalog={catalog} />

        <section className={styles.details} aria-label="Описание предложения">
          <article className={styles.detailCard}>
            <p className={styles.eyebrow}>Учебный формат</p>
            <h2>{catalog.product.offering.name}</h2>
            <dl className={styles.metaGrid}>
              <div>
                <dt>Формат</dt>
                <dd>{deliveryLabel(catalog.product.offering.deliveryMode)}</dd>
              </div>
              <div>
                <dt>Начало</dt>
                <dd>{dateLabel(catalog.product.offering.startsAt)}</dd>
              </div>
              <div>
                <dt>Окончание</dt>
                <dd>{dateLabel(catalog.product.offering.endsAt)}</dd>
              </div>
              <div>
                <dt>Оплата</dt>
                <dd>Разовая</dd>
              </div>
            </dl>
          </article>

          <article className={styles.detailCard}>
            <p className={styles.eyebrow}>Условия покупки</p>
            <h2>Перед оплатой проверим доступность</h2>
            <p className={styles.lead}>
              Цена и доступность могут измениться. Перед переходом к оплате
              мы проверим выбранный вариант и возможность покупки.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
