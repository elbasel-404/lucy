"use server";
import { getSearchResults } from "../web/getSearchResults";
import { webdownloadPage } from "../web/webdownloadPage";
import { retrieveSavedInfo } from "../ai/retrieveSavedInfo";
import { getAiResponse } from "../ai/getAiResponse";
import { readFile } from "fs/promises";
import { fileExists } from "../io/fileExists";
import { normalizeUrl } from "../../utils/normalizeUrl";
import { join } from "path";
import { log } from "../../utils/log";

/**
 * gatherInfo
 * - Given a user prompt, searches the web, downloads & converts top pages, records files,
 *   then runs a local retrieval over saved docs and produces a final AI answer.
 */
export async function gatherInfo(
  prompt: string,
  options?: {
    maxSearchResults?: number;
    maxDocsToDownload?: number;
    // force re-download even if docs exist
    force?: boolean;
  }
) {
  log({ message: "gatherInfo:start", extra: { prompt, options } });

  if (!prompt || typeof prompt !== "string") {
    return { error: "prompt must be a non-empty string" };
  }

  try {
    // 1. Search web
    const search = await getSearchResults(prompt);
    const items = search?.results ?? [];
    log({
      message: "gatherInfo:searchCompleted",
      extra: { resultCount: items.length },
    });

    // Limit the number of urls we try to download
    const maxSearch = options?.maxSearchResults ?? 6;
    const maxDownload = options?.maxDocsToDownload ?? 3;

    // Extract distinct http(s) urls
    const urls = Array.from(
      new Set(
        items
          .map((r: any) => r.url)
          .filter(Boolean)
          .map((u: string) => String(u))
      )
    ).slice(0, maxSearch);

    log({
      message: "gatherInfo:urlsToDownload",
      extra: { urls },
    });

    // 2. Check if top pages have already been scraped and download new ones
    //    (webdownloadPage writes to docs/). We prefer to skip download if a
    //    matching `.md` already exists unless options.force is true.
    const downloads = [] as any[];
    const toDownload = urls.slice(0, maxDownload);
    const downloadPromises = toDownload.map(async (url) => {
      // Determine the safe filename to check if this url was already scraped
      const normalized = normalizeUrl(url);
      const safe = normalized.replace(/[^a-zA-Z0-9_.-]/g, "-");
      const expectedFilename = `${safe}.md`;
      if (!options?.force && (await fileExists("docs", expectedFilename))) {
        // File already exists: skip re-downloading and just return path
        const path = `docs/${expectedFilename}`;
        downloads.push({ url, path, skipped: true });
        return { path };
      }
      try {
        const result = await webdownloadPage(url, {
          folder: "docs",
          maxChars: 150_000,
        });
        downloads.push({ url, ...result });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        downloads.push({ url, error: message });
        return { error: message };
      }
    });

    await Promise.all(downloadPromises);

    // 3. Retrieve saved docs relevance
    // Run retrieval AFTER we finish downloading the top search results so that
    // newly-scraped documents are included in the ranking. We also then
    // prioritize any fresh downloads so they can be read and included in the
    // final AI prompt.
    const retrieved = await retrieveSavedInfo(prompt, { maxFiles: 8 });

    log({
      message: "gatherInfo:retrievalCompleted",
      extra: { retrievedCount: retrieved.length },
    });
    // Ensure any newly downloaded docs are prioritized in the retrieval
    // results so the AI gets the freshest info first.
    const downloadedFilenames = downloads
      .filter((d) => d.path)
      .map((d) => String(d.path).replace(/^docs\//, ""));
    if (downloadedFilenames.length) {
      const existing = new Set(retrieved.map((r: any) => r.filename));
      for (const fn of downloadedFilenames) {
        if (!existing.has(fn)) {
          // Add a high-score entry for this newly downloaded file so it appears
          // first when we read top docs and assemble the prompt.
          retrieved.unshift({
            filename: fn,
            score: 100,
            relevant: true,
            snippet: "Newly scraped document",
            reason: "Newly scraped from search results",
          } as any);
          log({
            message: "gatherInfo:prioritizeDownloaded",
            extra: { filename: fn },
          });
        }
      }
    }

    // 4. Read top content (for more context to the AI): read up to 3 top documents
    const topFiles = retrieved.slice(0, 3);
    const docsFolder = join(process.cwd(), "docs");
    const filesWithContent: Array<{
      filename: string;
      content: string;
      score: number;
    }> = [];
    for (const f of topFiles) {
      try {
        const content = await readFile(join(docsFolder, f.filename), "utf-8");
        // Trim to a reasonable prompt length
        const excerpt = content.slice(0, 20_000);
        filesWithContent.push({
          filename: f.filename,
          content: excerpt,
          score: f.score,
        });
      } catch (err) {
        log({ message: "gatherInfo:readFile failed", extra: { f, err } });
      }
    }

    // 5. Ask the AI to synthesize a final answer using the prompt and retrieved docs
    // Build a prompt that includes filename, short snippet, and asks for a concise answer with sources.
    const promptParts = [] as string[];
    promptParts.push(`User query: ${prompt}`);
    if (downloads.length) {
      promptParts.push(`
Downloaded URLs (top results):\n${downloads
        .map((d) => `- ${d.url} -> ${d.path ?? d.error ?? "(failed)"}`)
        .join("\n")}
`);
    }

    if (filesWithContent.length) {
      promptParts.push("\nRelevant documents (filename + excerpt):\n");
      for (const f of filesWithContent) {
        const header = `== ${f.filename} (score: ${f.score}) ==`;
        // Keep snippet short in the prompt
        const snippet = f.content.replace(/\s+/g, " ").slice(0, 1000);
        promptParts.push(`${header}\n${snippet}\n`);
      }
    }

    promptParts.push(
      `\nPlease answer the user's query concisely and list which of the documents (by filename) were used as sources. Provide short citations.`
    );

    const fullPrompt = promptParts.join("\n---\n");
    const aiAnswer = await getAiResponse(fullPrompt);

    const output = {
      query: prompt,
      searchResults: items.slice(0, maxSearch),
      downloads,
      retrieved,
      answer: aiAnswer,
    };

    log({
      message: "gatherInfo:success",
      extra: { query: prompt, count: downloads.length },
    });

    return output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log({ message: "gatherInfo:error", extra: { error: message } });
    return { error: message };
  }
}
