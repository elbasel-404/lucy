"use server";
import { validate, ValidationResult } from "./validate";

import { log } from "../utils/log";
// Centralized fetch utility with Next.js caching features and validation
export async function fetchWithCache<T = any>(
  url: string,
  options?: RequestInit & { cache?: RequestCache; schema?: any; body?: any }
): Promise<{ data?: T; error?: Error | string }> {
  // If schema is provided, validate body (for POST) or query (for GET)
  if (options?.schema) {
    const validation: ValidationResult<T> = validate(
      options.schema,
      options.body ?? {}
    );
    if (!validation.success) {
      log({
        url,
        method: options?.method,
        status: "validation-error",
        message: validation.error.message,
      });
      return { error: validation.error.message };
    }
  }
  try {
    const fetchOptions: RequestInit = {
      ...options,
      cache: options?.cache ?? "force-cache",
    };
    const response = await fetch(url, fetchOptions);
    log({
      url,
      method: fetchOptions.method,
      status: response.status,
      message: response.ok ? "OK" : `HTTP error: ${response.status}`,
    });
    if (!response.ok) {
      return { error: `HTTP error: ${response.status}` };
    }
    const data = await response.json();
    return { data };
  } catch (err) {
    log({
      url,
      method: options?.method,
      status: "fetch-error",
      message: err instanceof Error ? err.message : String(err),
    });
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
