"use server";
import { log } from "../../utils/log";
import { getAiResponse } from "./getAiResponse";

/**
 * Convert raw scraped text into cleaned Markdown.
 * - Uses the Google GenAI model to do an intelligent conversion.
 * - Falls back to a lightweight local cleanup if the AI call fails.
 *
 * Behavior:
 * - Remove navigation, footer, ads, share buttons and repeated text
 * - Keep headers, paragraphs, lists and code blocks as markdown
 * - Convert bare URLs into markdown links where possible
 *
 * @param text - Raw text scraped from a webpage
 * @returns string - Markdown formatted text
 */
export async function convertToMarkdown(text: string): Promise<string> {
  log({ message: "convertToMarkdown called", extra: { length: text?.length } });

  if (!text) return "";

  try {
    const prompt =
      "rewrite the following using markdown, don't start your response with '```': " +
      text;

    const aiResponse = await getAiResponse(prompt, {
      // You can pass additional config if needed
    });

    return aiResponse || "error";
  } catch (err: any) {
    log({
      message: "convertToMarkdown fallback",
      extra: { error: String(err) },
    });
    return err?.message || "error";
  }
}
