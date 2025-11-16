// Converts a URL to a valid filename for caching
import { log } from "../../utils/log";
export function normalizeUrl(url: string): string {
  // Replace / with - and - with --
  const normalized = url.replace(/-/g, "--").replace(/\//g, "-");
  log({ message: "normalizeUrl", extra: { url, normalized } });
  return normalized;
}
