"use server";
import { log } from "../../utils/log";
import { access } from "fs/promises";
import { join } from "path";

export async function fileExists(
  folder: string,
  filename: string
): Promise<boolean> {
  try {
    const filePath = join(process.cwd(), folder, filename);
    await access(filePath);
    log({ message: "fileExists: file found", extra: { filePath } });
    return true;
  } catch {
    log({ message: "fileExists: file not found", extra: { folder, filename } });
    return false;
  }
}
