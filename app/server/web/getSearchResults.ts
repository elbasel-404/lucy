"use server";

import { fetchWithCache } from "../http/action";
import { log } from "../../utils/log";

export type SearchResult = {
  title: string;
  url?: string;
  snippet?: string;
  icon?: string;
};

export async function getSearchResults(
  query: string
): Promise<{ results?: SearchResult[]; error?: string }> {
  if (!query || typeof query !== "string") {
    return { error: "Query must be a non-empty string" };
  }

  try {
    // DuckDuckGo Instant Answer API - returns JSON with a few result sections.
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query
    )}&format=json&no_html=1&skip_disambig=1`;

    const { data, error } = await fetchWithCache(url, {
      method: "GET",
      cache: "force-cache",
    });
    if (error) {
      return { error: typeof error === "string" ? error : String(error) };
    }

    if (!data) {
      return { error: "No data returned from DuckDuckGo" };
    }

    const items: SearchResult[] = [];

    // Top-level abstract (may represent the best single match)
    if (data.AbstractText) {
      items.push({
        title: data.Heading || query,
        url: data.AbstractURL || undefined,
        snippet: data.AbstractText,
        icon: data.Image || undefined,
      });
    }

    // 'Results' is an array of instant answer result objects
    if (Array.isArray(data.Results)) {
      for (const r of data.Results) {
        items.push({
          title: r.Text || r.Result || r.Name || query,
          url: r.FirstURL || r.Url || undefined,
          snippet: r.Text || undefined,
        });
      }
    }

    // 'RelatedTopics' often contains search results mixed with topic groups
    if (Array.isArray(data.RelatedTopics)) {
      for (const t of data.RelatedTopics) {
        // Sometimes a topic is a group with a 'Topics' array
        if (Array.isArray(t.Topics)) {
          for (const sub of t.Topics) {
            items.push({
              title: sub.Text || sub.Name || query,
              url: sub.FirstURL || undefined,
              snippet: sub.Text || undefined,
            });
          }
        } else {
          items.push({
            title: t.Text || t.Name || query,
            url: t.FirstURL || undefined,
            snippet: t.Text || undefined,
          });
        }
      }
    }

    log({
      message: "getSearchResults success",
      extra: { query, count: items.length },
    });

    return { results: items };
  } catch (err) {
    log({ message: "getSearchResults failed", extra: { query, error: err } });
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
