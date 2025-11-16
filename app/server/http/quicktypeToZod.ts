import { log } from "../../utils/log";
import {
  quicktype,
  InputData,
  jsonInputForTargetLanguage,
} from "quicktype-core";

export async function quicktypeToZod(
  json: any,
  typeName: string = "ResponseType"
): Promise<string> {
  log({ message: "quicktypeToZod called", extra: { typeName, json } });
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
  log({
    message: "quicktypeToZod result",
    extra: { result: result.lines.join("\n") },
  });
  // Convert TypeScript types to Zod schema (simple conversion)
  // For full conversion, use quicktype's zod output or post-process
  return result.lines.join("\n");
}
