"use server";
import { GoogleGenAI } from "@google/genai";
import { log } from "../../utils/log";

const ai = new GoogleGenAI({});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * getAiResponse
 * - Calls the Google Gen AI model.
 * - Retries transient failures (e.g. 429, 500, 502, 503, 504) with exponential backoff.
 */
export async function getAiResponse(
  prompt: string,
  opts?: { maxRetries?: number; baseDelayMs?: number }
): Promise<string> {
  const maxRetries = opts?.maxRetries ?? 3;
  const baseDelay = opts?.baseDelayMs ?? 500;
  log({ message: "getAiResponse called", extra: { prompt } });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      log({
        message: "getAiResponse response",
        extra: { response: response.text },
      });
      return response.text ?? "";
    } catch (err: any) {
      const status = err?.status || err?.statusCode || err?.code || err?.response?.status;
      const name = err?.name || err?.code || "UnknownError";
      log({
        message: "getAiResponse error",
        extra: { attempt, err: { name, status } },
      });

      // If final attempt or non-retryable status -> rethrow
      const retryableStatus = [429, 500, 502, 503, 504];
      if (attempt >= maxRetries || (status && !retryableStatus.includes(Number(status)))) {
        throw err;
      }

      // Exponential backoff with jitter
      const delay = Math.round(baseDelay * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4));
      log({ message: "getAiResponse retrying", extra: { attempt, delay } });
      await sleep(delay);
    }
  }

  // Should not reach here because the loop either returns or throws, but as a guard:
  throw new Error("getAiResponse: exhausted retries");
}
