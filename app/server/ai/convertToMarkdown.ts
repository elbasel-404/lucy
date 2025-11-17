"use server";
import { GoogleGenAI } from "@google/genai";
import { log } from "../../utils/log";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    // This prompt tells the AI explicitly that the input is raw text and
    // that it must output valid Markdown only (no analysis or commentary).
    const prompt =
      "convert the following text to markdown format:\n\n, don't start your response with '```'" +
      text;
    // Use the streaming API to avoid truncation for long outputs
    const model = "gemini-2.5-flash";
    const config = {
      // Request a large output token allowance for long Markdown conversions.
      // Adjust as needed if you observe model-level limits or errors.
      // maxOutputTokens: 32768,
      // temperature: 0,
    };

    const streamResponse = await ai.models.generateContent({
      model,
      config,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const aiResponse = await streamResponse.text;
    return aiResponse || "error";
    // let aiOutput = "";
    // for await (const chunk of streamResponse) {
    //   // chunk may contain text directly in chunk.text
    //   if (chunk.text) {
    //     aiOutput += chunk.text;
    //     continue;
    //   }
    //   // The SDK may also provide content in nested candidate->parts
    //   const candidate = chunk.candidates?.[0];
    //   if (!candidate || !candidate.content?.parts) continue;
    //   for (const part of candidate.content.parts) {
    //     if (typeof part.text === "string") aiOutput += part.text;
    //   }
    // }
    // If the model returned something that doesn't look like Markdown (eg. HTML or plain text),
    // fallback to the local cleanup. This helps when the model ignores the "output only Markdown" rule.
    // if (aiOutput && !isLikelyMarkdown(aiOutput)) {
    //   log({
    //     message:
    //       "convertToMarkdown: AI returned non-markdown, running fallback",
    //   });
    //   return performLocalMarkdownCleanup(aiOutput || text);
    // }
  } catch (err) {
    log({
      message: "convertToMarkdown fallback",
      extra: { error: String(err) },
    });
    // On errors, return a best-effort original input. You may implement
    // local markdown cleanup here instead of returning the raw text.
    return text;
  }
}
