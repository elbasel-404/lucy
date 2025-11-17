"use server";
import { GoogleGenAI } from "@google/genai";
import { log } from "../../utils/log";

const ai = new GoogleGenAI({});

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
    const prompt = `You are an assistant that converts raw webpage text into tidy Markdown.\n
Rules:\n- Remove navigation labels, site footer, 'read more', share buttons, related links, and ads.\n- Remove repeated or boilerplate lines (e.g., 'Home', 'Contact', 'Subscribe', 'Share').\n- Preserve article headings, paragraphs, lists and code blocks.\n- Convert bare URLs into markdown links where possible.\n- If there are author/timestamp lines, remove them unless they are integral to the content.\n- Remove inline style or script artifacts and image placeholders, but preserve captions as plain text if relevant.\n- Output should be only Markdown, concise and clean.\n\nExample input:\n${text.slice(
      0,
      400
    )}\n\nPlease convert the input to Markdown now:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    log({
      message: "convertToMarkdown response",
      extra: { response: response.text?.slice(0, 200) },
    });

    return response.text ?? performLocalMarkdownCleanup(text);
  } catch (err) {
    log({
      message: "convertToMarkdown fallback",
      extra: { error: String(err) },
    });
    return performLocalMarkdownCleanup(text);
  }
}

/**
 * Lightweight local cleanup in case AI is unavailable.
 * This uses simple heuristics to remove navigational/boilerplate content
 * and convert simple URL-ish strings into Markdown links.
 */
function performLocalMarkdownCleanup(text: string): string {
  // Remove common navigation/footer markers and small repeated labels
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  const navKeywords = [
    "home",
    "about",
    "contact",
    "privacy",
    "terms",
    "subscribe",
    "read more",
    "share",
    "related",
    "©",
    "follow",
  ];

  const filtered = lines.filter((line, idx) => {
    if (!line) return false; // remove empty lines
    const low = line.toLowerCase();
    if (
      navKeywords.some(
        (k) => low === k || low.startsWith(k + " ") || low.endsWith(" " + k)
      )
    )
      return false;
    if (low.match(/^\d{1,2}:\d{1,2}(:\d{1,2})?\s*(am|pm)?$/)) return false; // times
    if (low.match(/^\d{4}-\d{2}-\d{2}/)) return false; // dates
    if (low.length < 20 && low.split(" ").length < 3) return false; // short noise lines
    return true;
  });

  let cleaned = filtered.join("\n\n");

  // Convert plain URLs to markdown links
  cleaned = cleaned.replace(
    /(?<!\])\bhttps?:\/\/[^\s)]+/g,
    (url) => `[${url}](${url})`
  );

  // Normalize multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}
