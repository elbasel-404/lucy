"use server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { log } from "./log";

export async function saveFile(
  folder: string,
  filename: string,
  data: any
): Promise<void> {
  const filePath = join(process.cwd(), folder, filename);
  log({ message: "saveFile:start", extra: { filePath } });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  log({ message: "saveFile:done", extra: { filePath } });
}
