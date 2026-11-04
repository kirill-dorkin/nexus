/** Reads `items[index]` and fails loudly when the index is out of range (a programming error). */
export function itemAt<T>(items: ArrayLike<T>, index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new RangeError(
      `Index ${index} is outside a list of ${items.length}.`
    );
  }
  return item;
}
