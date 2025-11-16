"use server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function saveFile(
  folder: string,
  filename: string,
  data: any
): Promise<void> {
  const filePath = join(process.cwd(), folder, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
