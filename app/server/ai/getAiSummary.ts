"use server";
import { GoogleGenAI } from "@google/genai";
import { log } from "../../utils/log";

const ai = new GoogleGenAI({});

export async function getAiSummary(text: string): Promise<string> {
  log({ message: "getAiSummary called", extra: { text } });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Summarize: ${text}`,
  });
  log({ message: "getAiSummary response", extra: { response: response.text } });
  return response.text ?? "";
}
