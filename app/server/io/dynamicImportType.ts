"use server";
import { log } from "../../utils/log";
export async function dynamicImportType(typeFilePath: string): Promise<any> {
  log({ message: "dynamicImportType called", extra: { typeFilePath } });
  const result = await import(typeFilePath);
  log({ message: "dynamicImportType result", extra: { result } });
  return result;
}
