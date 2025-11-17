"use server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { log } from "../../utils/log";
import { getAiResponse } from "./getAiResponse";

export type RetrievedFile = {
  filename: string;
  score: number; // 0-100 relevance score predicted by AI
  relevant: boolean;
  snippet: string; // short excerpt supporting relevance
  reason?: string; // optional AI explanation
};

/**
 * retrieveSavedInfo
 * - Scans the `docs/` folder for markdown files
 * - Summarizes files and asks the AI to rank relevance to `query`
 * - Returns a list of candidates with AI score and snippets
 *
 * Strategy:
 *  - Read docs/*.md
 *  - Generate short summaries for each file using `getAiSummary`
 *  - Ask the AI in a single prompt to evaluate all summaries and
 *    return a JSON object listing filename, score, snippet and reason.
 *  - If the AI response can't be parsed as JSON, fall back to a
 *    heuristic match (word frequency) so the function still returns results.
 */
export async function retrieveSavedInfo(
  query: string,
  options?: { minScore?: number; maxFiles?: number }
): Promise<RetrievedFile[]> {
  log({ message: "retrieveSavedInfo called", extra: { query, options } });

  const docsFolder = join(process.cwd(), "docs");
  try {
    const dirEntries = await readdir(docsFolder, { withFileTypes: true });
    const mdFiles = dirEntries
      .filter((d) => d.isFile() && d.name.endsWith(".md"))
      .map((d) => d.name);

    if (!mdFiles.length) return [];

    // Build a single prompt that contains filenames only (no file contents)
    // Ask the model to return a JSON array with fields: filename, score, relevant, snippet, reason
    const promptSections = mdFiles
      .map((filename) => `- ${filename}`)
      .join("\n");

    const prompt =
      `You are an assistant that ranks documents for a user's query.\n` +
      `User query: "${query}"\n\n` +
      `Here are document filenames (no contents were provided):\n\n${promptSections}\n\n` +
      `Return ONLY a JSON array. Each item must be an object with: filename (string), score (integer 0-100), relevant (boolean), snippet (string), reason (string).`;

    let aiResponse: string | null = null;
    try {
      aiResponse = await getAiResponse(prompt);
    } catch (err) {
      // Log error and attempt a local fallback heuristic (content-based scoring)
      log({ message: "retrieveSavedInfo: getAiResponse failed", extra: { err } });
      const fallback = await heuristicFallback(mdFiles, query, docsFolder, options);
      return fallback;
    }
    log({ message: "retrieveSavedInfo: aiResponse", extra: { aiResponse } });

    // Try parsing a JSON array response directly.
    const jsonText = extractJsonFromString(aiResponse);
    if (!jsonText) {
      log({
        message: "retrieveSavedInfo: failed to locate JSON in AI response, falling back to heuristic",
      });
      const fallback = await heuristicFallback(mdFiles, query, docsFolder, options);
      return fallback;
    }

    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) return [];
      const cleaned: RetrievedFile[] = parsed.map((r) => ({
        filename: String(r.filename || ""),
        score: Number(r.score) || 0,
        relevant: Boolean(r.relevant),
        snippet: String(r.snippet || "").slice(0, 400),
        reason: String(r.reason || ""),
      }));

      const filtered = cleaned
        .sort((a, b) => b.score - a.score)
        .filter((c, idx) => {
          if (typeof options?.maxFiles === "number" && idx >= options.maxFiles)
            return false;
          if (typeof options?.minScore === "number")
            return c.score >= options.minScore;
          return true;
        });
      return filtered;
    } catch (err) {
      log({
        message: "retrieveSavedInfo: failed to parse JSON, falling back to heuristic",
        extra: { err, aiResponse },
      });
      const fallback = await heuristicFallback(mdFiles, query, docsFolder, options);
      return fallback;
    }
  } catch (err) {
    log({ message: "retrieveSavedInfo: unexpected error", extra: { err } });
    return [];
  }
}

// Helpers
function extractJsonFromString(s: string): string | null {
  if (!s) return null;
  // Trim whitespace and try to locate either a leading '[' or '{' that contains a JSON array/object
  const firstArray = s.indexOf("[");
  const lastArray = s.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    const sub = s.slice(firstArray, lastArray + 1);
    try {
      JSON.parse(sub);
      return sub;
    } catch {
      // fallthrough
    }
  }
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const sub = s.slice(first, last + 1);
    try {
      JSON.parse(sub);
      return sub;
    } catch {
      return null;
    }
  }
  return null;
}

async function heuristicFallback(
  mdFiles: string[],
  query: string,
  docsFolder: string,
  options?: { minScore?: number; maxFiles?: number }
): Promise<RetrievedFile[]> {
  // Basic fallback: read a short snippet of each file and score by query-word frequency
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const fileSnippets = await Promise.all(
    mdFiles.map(async (filename) => {
      try {
        const content = await readFile(join(docsFolder, filename), "utf-8");
        return { filename, content: content.slice(0, 1000) };
      } catch (err) {
        log({ message: "heuristicFallback: error reading file", extra: { filename, err } });
        return { filename, content: "" };
      }
    })
  );

  const scored = fileSnippets.map((f) => {
    const lower = (f.filename + "\n" + f.content).toLowerCase();
    let count = 0;
    for (const t of tokens) {
      const matches = lower.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
      count += matches ? matches.length : 0;
    }
    // Simple scale: more matches -> higher score, limited to 100
    const score = Math.min(100, Math.round(count * 10));
    return {
      filename: f.filename,
      score,
      relevant: score > 0,
      snippet: f.content.slice(0, 300),
      reason: `Fallback: ${count} match(es) across filename + snippet`,
    } as RetrievedFile;
  });

  const filtered = scored
    .sort((a, b) => b.score - a.score)
    .filter((c, idx) => {
      if (typeof options?.maxFiles === "number" && idx >= options.maxFiles) return false;
      if (typeof options?.minScore === "number") return c.score >= options.minScore;
      return true;
    });
  return filtered;
}
// Note: The function is intentionally minimal: read docs, ask AI to rank documents, and return parsed results.
