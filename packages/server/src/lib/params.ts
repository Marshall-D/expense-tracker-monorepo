/**
 * Extract a resource id from Express route params.
 * Supports id / ID / _id for backwards compatibility with older clients.
 */
export function getPathId(
  params: Record<string, string | undefined>,
): string | undefined {
  return params.id || params.ID || params._id;
}
