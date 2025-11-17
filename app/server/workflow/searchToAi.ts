"use server";
import { getSearchResults } from "../web/getSearchResults";
import { getAiResponse } from "../ai/getAiResponse";
import { log } from "../../utils/log";

/**
 * searchToAi
 * - Accepts either a query string, or a previous step output from getSearchResults
 * - Returns an AI-generated summary based on the search titles
 */
export async function searchToAi(
  input: string | { results?: any[] },
  logId?: string
) {
  log({ message: "searchToAi:start", extra: { input, logId } });
  // If a string is provided, run a search first
  let resultsObj: any = null;
  if (typeof input === "string") {
    resultsObj = await getSearchResults(input);
  } else if (input && typeof input === "object") {
    resultsObj = input;
  }

  const items = resultsObj?.results ?? [];
  const titles = items.slice(0, 6).map((r: any) => r.title ?? "");
  const prompt = `Summarize the following search result titles: ${titles.join(
    "; "
  )}`;
  const ai = await getAiResponse(prompt, undefined, logId);
  log({
    message: "searchToAi:aiResponse",
    extra: { prompt, ai: ai?.slice?.(0, 200), logId },
  });
  return ai;
}
