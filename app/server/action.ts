"use server";
import { validate, ValidationResult } from "./validate";

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
      return { error: validation.error.message };
    }
  }
  try {
    const fetchOptions: RequestInit = {
      ...options,
      cache: options?.cache ?? "force-cache",
    };
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      return { error: `HTTP error: ${response.status}` };
    }
    const data = await response.json();
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
