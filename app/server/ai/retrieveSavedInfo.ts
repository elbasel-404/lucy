"use server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { log } from "../../utils/log";
import { getAiResponse } from "./getAiResponse";
import { getAiSummary } from "./getAiSummary";

export type RetrievedFile = {
  filename: string;
  score: number; // 0-100 relevance score predicted by AI
  relevant: boolean;
  snippet: string; // short excerpt to highlight relevance
  reason?: string; // short explanation from AI
  summary?: string; // AI generated short summary of the file
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

    // Read and gather content for each file. Keep a short preview for prompts.
    const fileContents = await Promise.all(
      mdFiles.map(async (filename) => {
        try {
          const content = await readFile(join(docsFolder, filename), "utf-8");
          return { filename, content };
        } catch (err) {
          log({
            message: "retrieveSavedInfo: error reading file",
            extra: { filename, err },
          });
          return { filename, content: "" };
        }
      })
    );

    // Use AI to create summaries for files (short) - keep in memory
    const summaries: Record<string, string> = {};
    for (const f of fileContents) {
      const text = (f.content || "").slice(0, 4_000); // limit input to avoid huge requests
      const summary = text ? await getAiSummary(text) : "";
      summaries[f.filename] = (summary || text || "").slice(0, 1_000);
    }

    // Build a single prompt that contains filenames and summaries.
    // Ask the model to return a JSON array with fields: filename, score, relevant, snippet, reason
    const promptSections = fileContents
      .map(
        (f) =>
          `- ${f.filename}: ${summaries[f.filename] || f.content.slice(0, 300)}`
      )
      .join("\n\n");

    const prompt =
      `You are an assistant that identifies helpful documents given a search query.\n` +
      `User query: "${query}"\n\n` +
      `Here are a set of documents with short summaries or previews:\n\n${promptSections}\n\n` +
      `Please return ONLY a JSON array named results; each item should be an object with: \n` +
      `  - filename (string) \n` +
      `  - score (integer 0-100) \n` +
      `  - relevant (boolean) \n` +
      `  - snippet (string, short excerpt supporting relevance) \n` +
      `  - reason (string, single sentence explaining relevance)\n\n` +
      `Respond with only valid JSON and no additional text. Put the most relevant files first.`;

    let aiResponse = await getAiResponse(prompt);
    log({ message: "retrieveSavedInfo: aiResponse", extra: { aiResponse } });

    // Ensure JSON extraction: sometimes the model includes stray text, so attempt to sanitize.
    const jsonText = extractJsonFromString(aiResponse, "results");
    if (jsonText) {
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          const cleaned: RetrievedFile[] = parsed.map((r) => ({
            filename: r.filename,
            score: Number(r.score) || 0,
            relevant: Boolean(r.relevant),
            snippet: String(r.snippet || "").slice(0, 400),
            reason: String(r.reason || ""),
            summary: summaries[String(r.filename) || ""],
          }));

          const filtered = cleaned
            .sort((a, b) => b.score - a.score)
            .filter((c, idx) => {
              if (
                typeof options?.maxFiles === "number" &&
                idx >= options.maxFiles
              )
                return false;
              if (typeof options?.minScore === "number")
                return c.score >= options.minScore;
              return true;
            });
          return filtered;
        }
      } catch (err) {
        log({
          message: "retrieveSavedInfo: failed to parse AI JSON response",
          extra: { err, aiResponse },
        });
      }
    }

    // If we've reached here, the AI response didn't parse; fallback to a heuristic approach
    const fallbackResults: RetrievedFile[] = fileContents
      .map((f) => {
        const score = heuristicScore(query, f.content);
        const snippet = findSnippet(query, f.content);
        return {
          filename: f.filename,
          score,
          relevant: score > (options?.minScore ?? 50),
          snippet,
          reason: `Fallback heuristic: ${score}% match based on word frequency.`,
          summary: summaries[f.filename],
        };
      })
      .sort((a, b) => b.score - a.score);

    const fallbackFiltered = fallbackResults.filter((c, idx) => {
      if (typeof options?.maxFiles === "number" && idx >= options.maxFiles)
        return false;
      if (typeof options?.minScore === "number")
        return c.score >= options.minScore;
      return true;
    });
    return fallbackFiltered;
  } catch (err) {
    log({ message: "retrieveSavedInfo: unexpected error", extra: { err } });
    return [];
  }
}

// Helpers
function extractJsonFromString(s: string, rootKey?: string): string | null {
  if (!s) return null;
  // Try to locate first '{' and last '}' and parse
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const sub = s.slice(first, last + 1);
    // If we expect a wrapper like { "results": [...] } but the model returned an array, allow both
    if (rootKey) {
      // If the result is an object with results, make sure it matches
      try {
        const parsed = JSON.parse(sub);
        if (Array.isArray(parsed)) return JSON.stringify(parsed);
        if (parsed && parsed[rootKey]) return JSON.stringify(parsed[rootKey]);
      } catch (err) {
        // continue to fallback
      }
    }
    try {
      JSON.parse(sub);
      return sub;
    } catch {
      return null;
    }
  }
  return null;
}

function heuristicScore(query: string, content: string): number {
  if (!content) return 0;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const text = content.toLowerCase();
  let count = 0;
  for (const t of tokens) {
    // count occurrences
    const re = new RegExp(escapeRegex(t), "g");
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  // Normalize into 0-100 range relative to file length
  const density = Math.min(1, count / Math.max(1, content.length / 200));
  return Math.round(density * 100);
}

function findSnippet(query: string, content: string): string {
  if (!content) return "";
  const q = query
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  const text = content;
  const lower = text.toLowerCase();
  for (const token of q) {
    const idx = lower.indexOf(token);
    if (idx >= 0) {
      return text.slice(
        Math.max(0, idx - 80),
        Math.min(text.length, idx + 140)
      );
    }
  }
  return text.slice(0, 200);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
