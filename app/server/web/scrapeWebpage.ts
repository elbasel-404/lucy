"use server";

import { log } from "../../utils/log";
import { load } from "cheerio";

export async function scrapeWebpage(
  url: string,
  options?: { maxChars?: number }
): Promise<{ text?: string; error?: string }> {
  // Basic validation
  if (!url || typeof url !== "string") {
    return { error: "URL must be a non-empty string" };
  }

  // Only allow http(s) to avoid file: or other protocols
  if (!/^https?:\/\//i.test(url)) {
    return { error: "URL must be an HTTP or HTTPS URL" };
  }

  try {
    log({ message: "scrapeWebpage fetch", url });

    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      const err = `HTTP error: ${res.status}`;
      log({ message: "scrapeWebpage fetch failed", url, status: res.status });
      return { error: err };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      const err = `Unsupported content type: ${contentType}`;
      log({
        message: "scrapeWebpage unsupported content type",
        url,
        extra: { contentType },
      });
      return { error: err };
    }

    const html = await res.text();

    // Load into cheerio and extract only textual content
    const $ = load(html);

    // Remove scripts, styles, and elements that typically don't contain readable text
    $(
      "script, style, noscript, iframe, header, footer, nav, svg, meta, link, form"
    ).remove();

    // Remove HTML comments (cheerio doesn't provide straightforward types here)
    // We'll simply remove html comment nodes using a regex as a minimal approach.
    // This keeps the types simple and avoids TS type errors.
    const htmlWithoutComments = html.replace(/<!--([\s\S]*?)-->/g, "");
    const $2 = load(htmlWithoutComments);
    // Re-run the removal of typical non-content nodes on the comment-free document.
    $2(
      "script, style, noscript, iframe, header, footer, nav, svg, meta, link, form"
    ).remove();

    // Grab body text if present, otherwise fall back to document text
    // Use the comment-stripped DOM when available
    let text = $2("body").text() || $2.root().text() || "";

    // Normalize whitespace: trim lines and collapse multiple spaces/newlines
    text = text
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean)
      .join("\n\n")
      .replace(/[\t\u00A0\r]+/g, " ")
      .trim();

    // Optionally limit the length of the returned text to avoid huge payloads
    const maxChars = options?.maxChars ?? 150_000;
    if (text.length > maxChars) text = text.slice(0, maxChars);

    log({
      message: "scrapeWebpage success",
      extra: { url, length: text.length },
    });

    return { text };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log({ message: "scrapeWebpage failed", extra: { url, error: message } });
    return { error: message };
  }
}
