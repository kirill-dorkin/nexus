import { uuidSchema } from "@platform/contracts";
import { notFound } from "next/navigation";

import { PaddleCheckout } from "./paddle-checkout";
import styles from "./checkout.module.css";

type CheckoutPageProps = Readonly<{
  params: Promise<{ purchaseId: string }>;
}>;

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const parsed = uuidSchema.safeParse((await params).purchaseId);
  if (!parsed.success) notFound();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Защищённая оплата</p>
        <h1>Открываем Paddle Checkout</h1>
        <p className={styles.copy}>
          Платёж обрабатывает Paddle. Возврат на Nexus не считается подтверждением
          оплаты: после завершения мы отдельно проверим канонический статус покупки.
        </p>
        <PaddleCheckout purchaseId={parsed.data} />
      </section>
    </main>
  );
}
