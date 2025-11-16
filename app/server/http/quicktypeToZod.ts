import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} from "quicktype-core";

export async function quicktypeToZod(
  json: any,
  typeName: string = "ResponseType"
): Promise<string> {
  const jsonInput = jsonInputForTargetLanguage("typescript");
  await jsonInput.addSource({
    name: typeName,
    samples: [JSON.stringify(json)],
  });
  const inputData = new InputData();
  inputData.addInput(jsonInput);
  const result = await quicktype({
    inputData,
    lang: "typescript",
    rendererOptions: { "just-types": "true" },
  });
  // Convert TypeScript types to Zod schema (simple conversion)
  // For full conversion, use quicktype's zod output or post-process
  return result.lines.join("\n");
}
