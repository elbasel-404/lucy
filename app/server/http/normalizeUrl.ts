// Converts a URL to a valid filename for caching
export function normalizeUrl(url: string): string {
  // Replace / with - and - with --
  return url.replace(/-/g, "--").replace(/\//g, "-");
}
