"use server";
export async function dynamicImportType(typeFilePath: string): Promise<any> {
  // Dynamic import for type file
  return import(typeFilePath);
}
