"use server";
import { log } from "../../utils/log";
import { readFile } from "fs/promises";
import { join } from "path";

export async function readJson(
  folder: string,
  filename: string
): Promise<any | null> {
  try {
    const filePath = join(process.cwd(), folder, filename);
    const content = await readFile(filePath, "utf-8");
    log({ message: "readJson: file read", extra: { filePath } });
    return JSON.parse(content);
  } catch (error) {
    log({
      message: "readJson: error reading file",
      extra: { folder, filename, error },
    });
    return null;
  }
}
