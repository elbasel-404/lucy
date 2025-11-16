"use server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function getAiExplanation(topic: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Explain: ${topic}`,
  });
  return response.text ?? "";
}
