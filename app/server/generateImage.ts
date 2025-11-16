"use server";

import { GoogleGenAI } from "@google/genai";
import { log } from "../utils/log";
import mime from "mime";
import { writeFile } from "fs";

function saveBinaryFile(fileName: string, content: Buffer) {
  writeFile(fileName, content, "utf8", (err) => {
    if (err) {
      log({
        message: `Error writing file ${fileName}`,
        extra: { error: err },
      });
      return;
    }
    log({
      message: `File ${fileName} saved to file system.`,
    });
  });
}

export async function generateImage(input: string) {
  log({ message: "generateImage called", extra: { input } });
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
  const config = {
    responseModalities: ["IMAGE", "TEXT"],
    imageConfig: {
      imageSize: "1K",
    },
  };
  const model = "gemini-2.5-flash-image";
  const contents = [
    {
      role: "user",
      parts: [
        {
          text: input,
        },
      ],
    },
  ];

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  });
  let fileIndex = 0;
  for await (const chunk of response) {
    if (
      !chunk.candidates ||
      !chunk.candidates[0].content ||
      !chunk.candidates[0].content.parts
    ) {
      continue;
    }
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const fileName = `ENTER_FILE_NAME_${fileIndex++}`;
      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      const fileExtension = mime.getExtension(inlineData.mimeType || "");
      const buffer = Buffer.from(inlineData.data || "", "base64");
      saveBinaryFile(`${fileName}.${fileExtension}`, buffer);
    } else {
      console.log(chunk.text);
    }
  }
}
