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
  opts?: { maxRetries?: number; baseDelayMs?: number },
  logId?: string
): Promise<string> {
  let maxRetries = 3;
  let baseDelay = 500;
  try {
    if (opts && typeof opts === "object") {
      if (typeof (opts as any).maxRetries === "number") {
        maxRetries = (opts as any).maxRetries;
      }
      if (typeof (opts as any).baseDelayMs === "number") {
        baseDelay = (opts as any).baseDelayMs;
      }
    }
  } catch (err) {
    // If we reached here it likely means a client-only reference was passed
    // into a server action. Provide a clear message for debugging.
    const message =
      "Cannot access maxRetries on the server. You cannot dot into a temporary client reference from a server component. You can only pass the value through to the client.";
    log({
      message: "getAiResponse:invalidOpts",
      extra: { error: String(err) },
    });
    throw new Error(message);
  }
  log({ message: "getAiResponse called", extra: { prompt, logId } });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      log({
        message: "getAiResponse response",
        extra: { response: response.text, logId },
      });
      return response.text ?? "";
    } catch (err: any) {
      // Try to robustly extract an HTTP numeric status or string status from
      // several error shapes that the Google GenAI library (or network
      // libraries) might return. Example shapes:
      //  - { status: 503 }
      //  - { code: 503 }
      //  - { error: { code: 503, status: 'UNAVAILABLE' } }
      //  - { response: { status: 503 } }
      //  - { name: 'AbortError' }
      const statusNumberCandidates = [
        err?.error?.code,
        err?.status,
        err?.statusCode,
        err?.code,
        err?.response?.status,
        err?.response?.statusCode,
      ];

      let status: number | undefined;
      for (const candidate of statusNumberCandidates) {
        if (typeof candidate === "number") {
          status = candidate;
          break;
        }
        if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
          status = Number(candidate);
          break;
        }
      }

      // Also extract string statuses (gRPC-style) or high-level reasons.
      const statusStringCandidates = [
        err?.error?.status,
        err?.reason,
        err?.code,
        err?.message,
        err?.response?.statusText,
      ];
      const statusString =
        statusStringCandidates.find((s) => typeof s === "string") ?? undefined;

      const name =
        err?.name ||
        (typeof err?.code === "string" ? err.code : "UnknownError");
      log({
        message: "getAiResponse error",
        extra: {
          attempt,
          err: { name, status, statusString, message: err?.message },
          logId,
        },
      });

      // If final attempt or non-retryable status -> rethrow
      // Retry on common HTTP retry status codes and some string reasons used by
      // cloud APIs (e.g., 'UNAVAILABLE' when a model is overloaded).
      const retryableStatus = [429, 500, 502, 503, 504];
      const retryableStatusStrings = [
        "UNAVAILABLE",
        "RESOURCE_EXHAUSTED",
        "RATE_LIMIT_EXCEEDED",
        "TOO_MANY_REQUESTS",
        "ABORTED",
      ];
      const shouldRetryNumber =
        typeof status === "number" && retryableStatus.includes(status);
      const shouldRetryString =
        typeof statusString === "string" &&
        retryableStatusStrings.some((r) =>
          statusString?.toUpperCase().includes(r)
        );

      if (attempt >= maxRetries || (!shouldRetryNumber && !shouldRetryString)) {
        // Not retrying — rethrow the original error so callers can inspect it.
        throw err;
      }

      // Exponential backoff with jitter
      const delay = Math.round(
        baseDelay * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4)
      );
      log({
        message: "getAiResponse retrying",
        extra: { attempt, delay, status, statusString, logId },
      });
      await sleep(delay);
    }
  }

  // Should not reach here because the loop either returns or throws, but as a guard:
  throw new Error("getAiResponse: exhausted retries");
}
