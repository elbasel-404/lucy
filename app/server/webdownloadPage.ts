"use server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { log } from "../utils/log";
import { scrapeWebpage } from "./web/scrapeWebpage";
import { convertToMarkdown } from "./ai/convertToMarkdown";
import { normalizeUrl } from "../utils/normalizeUrl";

/**
 * Download a URL, convert the readable text to Markdown, and write it to /docs/
 * @param url - The page URL to download
 * @param options - Optional settings (maxChars: limit for scraping; folder: where to save)
 * @returns { path?:string, rawPath?:string, error?:string }
 */
export async function webdownloadPage(
  url: string,
  options?: { maxChars?: number; folder?: string }
): Promise<{ path?: string; rawPath?: string; error?: string }> {
  const folder = options?.folder ?? "docs";
  if (!url || typeof url !== "string") {
    return { error: "url must be a non-empty string" };
  }

  if (!/^https?:\/\//i.test(url)) {
    return { error: "only http(s) urls are supported" };
  }

  try {
    log({ message: "webdownloadPage:start", extra: { url } });

    const scraped = await scrapeWebpage(url, {
      maxChars: options?.maxChars,
    });
    if (scraped.error) {
      log({ message: "webdownloadPage:scrapeError", extra: { url } });
      return { error: scraped.error };
    }

    const text = scraped.text ?? "";
    if (!text) {
      return { error: "no text could be extracted from url" };
    }

    const markdown = await convertToMarkdown(text);

    // Create sanitized filename
    const normalized = normalizeUrl(url);
    // Reduce to safe filename characters
    const safe = normalized.replace(/[^a-zA-Z0-9_.-]/g, "-");
    const filename = `${safe}.md`;
    const rawFilename = `${safe}.txt`;

    // Ensure docs directory exists and write file
    const absoluteFolder = join(process.cwd(), folder);
    await mkdir(absoluteFolder, { recursive: true });
    const outPath = join(absoluteFolder, filename);
    const rawPath = join(absoluteFolder, rawFilename);
    await writeFile(outPath, markdown, "utf-8");
    await writeFile(rawPath, text, "utf-8");

    log({
      message: "webdownloadPage:success",
      extra: { url, path: outPath, rawPath },
    });
    return {
      path: `${folder}/${filename}`,
      rawPath: `${folder}/${rawFilename}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log({ message: "webdownloadPage:error", extra: { url, error: message } });
    return { error: message };
  }
}
