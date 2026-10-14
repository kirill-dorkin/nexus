"use client";

import { Button } from "@platform/ui";

export function CatalogRetry() {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => window.location.reload()}
    >
      Попробовать снова
    </Button>
  );
}
