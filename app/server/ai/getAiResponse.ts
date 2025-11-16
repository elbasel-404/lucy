"use server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export async function getAiResponse(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  // Return only the text response, no streaming
  return response.text ?? "";
}
