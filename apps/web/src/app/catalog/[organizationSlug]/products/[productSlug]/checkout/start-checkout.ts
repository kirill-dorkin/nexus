import {
  publicCatalogProductResponseSchema,
  publicPurchaseCheckoutSchema,
  type PublicCatalogProductResponse
} from "@platform/contracts";
import {
  apiError,
  browserApiRequest,
  PublicApiError
} from "../../../../../../lib/public-api";

async function currentProduct(
  catalog: PublicCatalogProductResponse
): Promise<PublicCatalogProductResponse> {
  const response = await browserApiRequest(
    `/v1/public/catalog/${encodeURIComponent(catalog.organization.slug)}/products/${encodeURIComponent(catalog.product.slug)}`
  );
  if (!response.ok) throw await apiError(response);
  return publicCatalogProductResponseSchema.parse(await response.json());
}

/**
 * Re-reads the offer, joins an open organization, creates the pending
 * purchase and returns the payment page. Failures are PublicApiErrors with a
 * learner-facing message; `onSessionEnded` runs when the API answers 401.
 */
export async function startCheckout({
  catalog,
  priceId,
  attemptKey,
  onStatus,
  onSessionEnded
}: {
  catalog: PublicCatalogProductResponse;
  priceId: string;
  attemptKey: (priceId: string) => string;
  onStatus: (message: string) => void;
  onSessionEnded: () => void;
}): Promise<string> {
  const sessionEnded = () => {
    onSessionEnded();
    return new PublicApiError(401, "Сессия завершилась. Войдите снова.");
  };
  const fresh = await currentProduct(catalog);
  const price = fresh.product.prices.find((p) => p.id === priceId);
  if (price === undefined) {
    throw new PublicApiError(
      409,
      "Выбранная цена больше недоступна. Обновите страницу и выберите актуальную цену."
    );
  }

  if (fresh.organization.customerEntryPolicy === "open") {
    onStatus("Подтверждаем участие в организации…");
    const entry = await browserApiRequest(
      `/v1/public/organizations/${encodeURIComponent(fresh.organization.slug)}/memberships/me`,
      { method: "POST" }
    );
    if (entry.status === 401) throw sessionEnded();
    if (entry.status === 409) {
      throw new PublicApiError(
        409,
        "Текущее состояние участия нельзя изменить через публичный вход."
      );
    }
    // A 404 can mean that open entry closed after the fresh read. Checkout is
    // still attempted because an already-active member remains authorized.
    if (!entry.ok && entry.status !== 404) throw await apiError(entry);
  }

  const idempotencyKey = attemptKey(price.id);
  onStatus("Создаём защищённую сессию оплаты…");
  const response = await browserApiRequest(
    `/v1/public/catalog/${encodeURIComponent(fresh.organization.slug)}/products/${encodeURIComponent(fresh.product.slug)}/checkout`,
    {
      method: "POST",
      body: JSON.stringify({ priceId: price.id, idempotencyKey })
    }
  );
  if (response.status === 401) throw sessionEnded();
  if (response.status === 404) {
    throw new PublicApiError(
      404,
      "Покупка сейчас недоступна. Проверьте участие в организации и актуальность предложения."
    );
  }
  if (response.status === 409) {
    throw new PublicApiError(
      409,
      "Состояние покупки изменилось. Обновите страницу перед новой попыткой."
    );
  }
  if (!response.ok) throw await apiError(response);
  return publicPurchaseCheckoutSchema.parse(await response.json()).checkoutUrl;
}
