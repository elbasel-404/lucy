"use server";
import { GoogleGenAI } from "@google/genai";
import { log } from "../../utils/log";

const ai = new GoogleGenAI({});

export async function getAiExplanation(topic: string): Promise<string> {
  log({ message: "getAiExplanation called", extra: { topic } });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Explain: ${topic}`,
  });
  log({
    message: "getAiExplanation response",
    extra: { response: response.text },
  });
  return response.text ?? "";
}
