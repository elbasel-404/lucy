"use server";

import { load } from "cheerio";
import { log } from "../../utils/log";

export type SearchResult = {
  title: string;
  url?: string;
  snippet?: string;
  icon?: string;
};

/**
 * Try to extract the external (destination) URL from a DuckDuckGo result.
 * - If `firstUrl` is an external host return it.
 * - If `firstUrl` is a DuckDuckGo redirect (contains uddg param), decode it and return.
 * - If `resultHtml` contains an anchor tag, extract the href and return it if external.
 */
function extractExternalUrl(
  firstUrl?: string | null,
  resultHtml?: string | null
): string | undefined {
  if (!firstUrl && !resultHtml) return undefined;

  // Prefer a direct external host on FirstURL
  if (firstUrl) {
    try {
      // Support DuckDuckGo's scheme-less "//duckduckgo.com/..." URLs by
      // treating them as HTTPS. This avoids URL parsing errors and lets us
      // extract the uddg param when present.
      let safeFirst = firstUrl;
      if (safeFirst.startsWith("//")) safeFirst = `https:${safeFirst}`;
      const parsed = new URL(safeFirst);

      // If it's not a DuckDuckGo host, use it directly
      if (!parsed.hostname.includes("duckduckgo.com")) {
        return parsed.href;
      }

      // If it is a DuckDuckGo redirect with uddg param (common for external links)
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) {
        try {
          return decodeURIComponent(uddg);
        } catch (e) {
          return uddg;
        }
      }

      // Fallback heuristic: look for uddg encoded in string
      const match = firstUrl.match(/uddg=(https?%3A%2F%2F[^&]+)/i);
      if (match && match[1]) {
        try {
          return decodeURIComponent(match[1]);
        } catch (e) {
          return match[1];
        }
      }
    } catch (e) {
      // ignore URL parsing errors and continue to HTML parsing
    }
  }

  // Try extracting from the Result/ResultHtml that contains an anchor
  if (resultHtml && typeof resultHtml === "string") {
    const hrefMatch = resultHtml.match(
      /href=(?:(?:\")|(?:\'))([^\"']+)(?:(?:\")|(?:\'))/i
    );
    if (hrefMatch && hrefMatch[1]) {
      try {
        const h = hrefMatch[1];
        // Only return http(s) external links
        if (/^https?:\/\//i.test(h)) return h;
      } catch (e) {
        // ignore
      }
    }
  }

  // Nothing better — return the original firstUrl as a final fallback.
  return firstUrl || undefined;
}

export async function getSearchResults(
  query: string
): Promise<{ results?: SearchResult[]; error?: string }> {
  // Normalize input: trim whitespace and ensure it's not empty after trim
  if (!query || typeof query !== "string") {
    return { error: "Query must be a non-empty string" };
  }

  // Also normalize internal whitespace to single spaces so queries like
  // "a   b" become "a b". This matches expected search engine input.
  const trimmedQuery = query.trim().replace(/\s+/g, " ");
  if (!trimmedQuery) {
    return { error: "Query must contain non-whitespace characters" };
  }

  try {
    // Scrape DuckDuckGo search results HTML using cheerio. This bypasses
    // the API and tries to extract titles, urls, and snippets as seen on
    // the public search results page.
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(
      trimmedQuery
    )}`;
    const res = await fetch(url, {
      method: "GET",
      // We want server-side caching where possible — mimic the previous
      // behavior but call fetch directly to obtain HTML.
      cache: "force-cache",
      headers: {
        // Use a common user agent to reduce likelihood of being blocked
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
    });

    if (!res.ok) {
      return { error: `HTTP error: ${res.status}` };
    }

    const html = await res.text();

    // Load into cheerio for parsing
    const results = parseSearchResultsHtml(html, trimmedQuery);

    log({
      message: "getSearchResults success",
      extra: { query: trimmedQuery, count: results.length },
    });
    return { results };
  } catch (err) {
    log({
      message: "getSearchResults failed",
      extra: { query: trimmedQuery, error: err },
    });
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Parse the HTML of a DuckDuckGo search results page and return extracted
 * SearchResult items. This is separated so tests can call the parser directly
 * with prepared HTML.
 */
function parseSearchResultsHtml(
  html: string,
  trimmedQuery: string
): SearchResult[] {
  const $ = load(html);

  $(
    "script, style, noscript, iframe, header, footer, nav, svg, meta, link, form"
  ).remove();

  const items: SearchResult[] = [];

  const anchors = $(
    "a.result__a, a.result-link, a[data-testid='result-title-a']"
  ).toArray();

  if (anchors.length === 0) {
    $(
      "article[data-testid='result'], [data-testid='result'], .result, .result__body, .web-result"
    ).each((i: number, el: any) => {
      const link = $(el).find("a[href]").first();
      if (!link || !link.attr("href")) return;
      const raw = link.attr("href");
      const title =
        link.text().trim() || $(el).find("h2, .result__title").text().trim();
      const snippet = (
        $(el)
          .find(
            '.result__snippet, .result__excerpt, .snippet, [data-result="snippet"]'
          )
          .text() || ""
      ).trim();
      const url = extractExternalUrl(raw, $(el).html());
      items.push({
        title: title || trimmedQuery,
        url: url || undefined,
        snippet: snippet || undefined,
      });
    });
  } else {
    for (const a of anchors) {
      const $a = $(a);
      const raw = $a.attr("href");
      const title = $a.text().trim() || $(a).attr("title") || trimmedQuery;

      let parent = $a.closest(
        "article[data-testid='result'], [data-testid='result'], .result, .result__body, .web-result"
      );
      if (!parent.length) {
        parent = $a
          .parents()
          .filter(
            (i: number, el: any) =>
              $(el).find(
                '[data-result="snippet"], .result__snippet, .result__excerpt, .snippet'
              ).length > 0
          )
          .first();
      }
      if (!parent.length) parent = $a.closest("article, div, li");

      const snippet = (
        parent
          .find(
            '.result__snippet, .result__excerpt, .snippet, [data-result="snippet"]'
          )
          .text() || ""
      ).trim();
      const extracted = extractExternalUrl(raw, parent.html());

      items.push({
        title,
        url: extracted || undefined,
        snippet: snippet || undefined,
      });
    }
  }

  return items;
}
