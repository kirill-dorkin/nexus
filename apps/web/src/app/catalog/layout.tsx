import type { ReactNode } from "react";
import { Container } from "@platform/ui";
import { PublicHeader } from "../../components/learning/public-header";
import styles from "../../components/learning/learning.module.css";

/**
 * Public catalog products use the same theme-safe navigation as free learning.
 * Checkout remains a separate first-party/payment boundary, not an auth shell.
 */
export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <Container className={styles.shell}>
      <a className={styles.skip} href="#catalog-main">
        Перейти к содержимому
      </a>
      <PublicHeader />
      <div id="catalog-main" tabIndex={-1}>
        {children}
      </div>
    </Container>
  );
}
