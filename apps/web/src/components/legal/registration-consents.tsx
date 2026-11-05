import Link from "next/link";
import { Checkbox } from "@platform/ui";
import styles from "./legal.module.css";

/**
 * Required consent checkboxes for registration; the server records the version of each document
 * (`currentRegistrationConsents`). There is deliberately no marketing consent.
 * Links open in a new tab so the half-filled form is not lost.
 */
export function RegistrationConsents({ disabled }: { disabled?: boolean }) {
  return (
    <div className={styles.consents}>
      <Checkbox
        name="consentTerms"
        required
        disabled={disabled}
        label={
          <>
            Я принимаю условия{" "}
            <Link href="/terms" target="_blank" rel="noopener">
              пользовательского соглашения
            </Link>
          </>
        }
      />
      <Checkbox
        name="consentPersonalData"
        required
        disabled={disabled}
        label={
          <>
            Я даю согласие на обработку моих персональных данных, в том числе на
            их передачу за рубеж, на условиях{" "}
            <Link href="/privacy" target="_blank" rel="noopener">
              политики конфиденциальности
            </Link>
          </>
        }
      />
    </div>
  );
}
