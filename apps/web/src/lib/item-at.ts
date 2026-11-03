/**
 * Reads `items[index]` (an array or a string) and fails loudly when the index is out of range.
 * Use it where the index comes from the same array (a `.map` index, a loop
 * bound), so a miss means a programming error rather than missing data.
 */
export function itemAt<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new RangeError(
      `Index ${index} is outside a list of ${items.length}.`
    );
  }
  return item;
}
