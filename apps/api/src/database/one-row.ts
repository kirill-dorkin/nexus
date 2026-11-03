/**
 * The single row of a statement that always returns exactly one
 * (`INSERT … RETURNING`, a lookup by a key the same transaction just wrote).
 * A missing row is a broken invariant, so it throws instead of yielding undefined.
 */
export function oneRow<T>(result: Readonly<{ rows: readonly T[] }>, what: string): T {
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error(`PostgreSQL returned no row for ${what}.`);
  }
  return row;
}
