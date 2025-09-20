export function getFirstOrNull(results: unknown[]) {
  return results.length > 0 ? results[0] : null;
}
