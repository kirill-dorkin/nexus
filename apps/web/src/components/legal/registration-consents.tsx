import Link from "next/link";
import { Checkbox } from "@platform/ui";
import styles from "./legal.module.css";

/**
 * Required consent checkboxes for registration. The wording is a placeholder for the owner to
 * confirm; the server records the version of each document (`currentRegistrationConsents`).
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
            Я принимаю{" "}
            <Link href="/terms" target="_blank" rel="noopener">
              условия использования
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
            Я даю согласие на обработку персональных данных в соответствии с{" "}
            <Link href="/privacy" target="_blank" rel="noopener">
              политикой конфиденциальности
            </Link>
          </>
        }
      />
    </div>
  );
}
