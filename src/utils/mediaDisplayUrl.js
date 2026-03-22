/**
 * Resolve a playable/display URL for media items (S3 signed URL, CDN displayUrl, etc.)
 */
export function getMediaDisplayUrl(item) {
  if (!item) return undefined;
  return item.displayUrl || item.url;
}
