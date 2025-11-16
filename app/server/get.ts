"use server";
import { fetchWithCache } from "./action";
import { normalizeUrl } from "../server/http/normalizeUrl";
import { fileExists } from "../server/io/fileExists";
import { readJson } from "../server/io/readJson";
import { saveFile } from "../utils/saveFile";
import { dynamicImportType } from "../server/io/dynamicImportType";

type GetArgs = {
  url: string;
  schema?: any;
  fetchOptions?: RequestInit;
};

export async function get<T = any>({
  url,
  schema,
  fetchOptions,
}: GetArgs): Promise<{ data?: T; error?: string }> {
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
          return { error: "Cached response failed validation" };
        }
        return { data: cached };
      }
    }
    return { data: cached };
  }

  // Fetch from server
  const result = await fetchWithCache<T>(url, {
    ...fetchOptions,
    method: "GET",
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
