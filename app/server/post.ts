"use server";
import { fetchWithCache } from "./action";
import { log } from "../utils/log";
import { normalizeUrl } from "../server/http/normalizeUrl";
import { fileExists } from "../server/io/fileExists";
import { readJson } from "../server/io/readJson";
import { saveFile } from "../utils/saveFile";
import { dynamicImportType } from "../server/io/dynamicImportType";

type PostArgs = {
  url: string;
  body: any;
  schema?: any;
  fetchOptions?: RequestInit;
};

export async function post<T = any>({
  url,
  body,
  schema,
  fetchOptions,
}: PostArgs): Promise<{ data?: T; error?: string }> {
  const jsonFolder = "app/json";
  const typesFolder = "app/types";
  const normalized = normalizeUrl(url);
  const jsonFile = `${normalized}.json`;
  const typeFile = `${normalized}.type.ts`;

  // Check for cached JSON
  if (await fileExists(jsonFolder, jsonFile)) {
    const cached = await readJson(jsonFolder, jsonFile);
    // Check for type file
    if (await fileExists(typesFolder, typeFile)) {
      const typeModule = await dynamicImportType(
        `../../${typesFolder}/${typeFile}`
      );
      if (typeModule && typeModule.default) {
        const validation = typeModule.default.safeParse(cached);
        if (!validation.success) {
          log({
            url,
            status: "validation-error",
            message: "Cached response failed validation",
          });
          return { error: "Cached response failed validation" };
        }
        log({ url, status: 200, message: "Cache hit and validated" });
        return { data: cached };
      }
    }
    log({ url, status: 200, message: "Cache hit" });
    return { data: cached };
  }

  // Fetch from server
  const result = await fetchWithCache<T>(url, {
    ...fetchOptions,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(fetchOptions?.headers || {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    schema,
  });
  if (result.data) {
    await saveFile(jsonFolder, jsonFile, result.data);
  }
  return {
    data: result.data,
    error:
      typeof result.error === "string"
        ? result.error
        : result.error?.toString(),
  };
}
