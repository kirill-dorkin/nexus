import {
  publicCatalogProductResponseSchema,
  type PublicCatalogProductResponse
} from "@platform/contracts";
import { notFound } from "next/navigation";

import { organizationName } from "../../../../../lib/public-learning-routes";
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
    throw new Error(
      `Public catalog request failed with status ${response.status}.`
    );
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

export default async function PublicProductPage({
  params
}: PublicProductPageProps) {
  const { organizationSlug, productSlug } = await params;
  const catalog = await loadProduct(organizationSlug, productSlug);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{organizationName(catalog.organization)}</p>
        <h1 className={styles.title}>{catalog.product.name}</h1>
        <p className={styles.lead}>
          {catalog.product.offering.name}. Актуальная цена и доступность ещё раз
          проверяются сервером непосредственно перед созданием покупки.
        </p>
      </header>

      <div className={styles.layout}>
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
            <p className={styles.eyebrow}>Безопасность покупки</p>
            <h2>Платёж начинается только из актуального состояния</h2>
            <p className={styles.lead}>
              Браузер не определяет организацию, стоимость, внутренний продукт
              или пользователя покупки. Эти данные повторно разрешаются и
              проверяются API перед переходом к защищённой платёжной странице.
            </p>
          </article>
        </section>

        <CheckoutPanel catalog={catalog} />
      </div>
    </main>
  );
}
