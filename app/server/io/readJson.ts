"use server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function readJson(
  folder: string,
  filename: string
): Promise<any | null> {
  try {
    const filePath = join(process.cwd(), folder, filename);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
