"use server";
import { GoogleGenAI } from "@google/genai";
import { log } from "../../utils/log";

const ai = new GoogleGenAI({});

export async function getAiResponse(prompt: string): Promise<string> {
  log({ message: "getAiResponse called", extra: { prompt } });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  log({
    message: "getAiResponse response",
    extra: { response: response.text },
  });
  return response.text ?? "";
}
