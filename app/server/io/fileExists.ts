"use server";
import { access } from "fs/promises";
import { join } from "path";

export async function fileExists(
  folder: string,
  filename: string
): Promise<boolean> {
  try {
    const filePath = join(process.cwd(), folder, filename);
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
