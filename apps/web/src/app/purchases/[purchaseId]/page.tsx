import { uuidSchema } from "@platform/contracts";
import { notFound } from "next/navigation";

import { PurchaseStatus } from "./purchase-status";
import styles from "./purchase.module.css";

type PurchasePageProps = Readonly<{
  params: Promise<{ purchaseId: string }>;
}>;

export default async function PurchasePage({ params }: PurchasePageProps) {
  const parsed = uuidSchema.safeParse((await params).purchaseId);
  if (!parsed.success) notFound();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Статус покупки</p>
        <h1>Проверяем подтверждение оплаты</h1>
        <p className={styles.copy}>
          Возврат из Paddle означает только завершение checkout UX. Доступ появится
          после того, как подписанный webhook будет обработан сервером платформы.
        </p>
        <PurchaseStatus purchaseId={parsed.data} />
      </section>
    </main>
  );
}
