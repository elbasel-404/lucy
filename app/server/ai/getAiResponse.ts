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
        extra: { attempt, delay, status, statusString },
      });
      await sleep(delay);
    }
  }

  // Should not reach here because the loop either returns or throws, but as a guard:
  throw new Error("getAiResponse: exhausted retries");
}
