// /pages/api/upload-dive-image.js
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const form = new formidable.IncomingForm({ uploadDir: "/tmp", keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    const uploaded = files?.files || files?.file;
    const fileArray = Array.isArray(uploaded) ? uploaded : [uploaded];

    if (err || !fileArray.length) {
      return res.status(400).json({ error: "Image upload failed" });
    }

    const firstFile = fileArray[0]; // Analyze just the first one for now
    const fileData = fs.readFileSync(firstFile.filepath);
    const base64Image = fileData.toString("base64");

    try {
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: "You are a freediving coach analyzing dive profile images. Provide helpful and precise feedback based only on what you see.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${firstFile.mimetype};base64,${base64Image}`,
                },
              },
              {
                type: "text",
                text: "Please analyze this dive profile image and give feedback or observations.",
              },
            ],
          },
        ],
        max_tokens: 800,
      });

      const answer = visionResponse.choices[0]?.message?.content;
      return res.status(200).json({ answer });
    } catch (e) {
      console.error("Vision error:", e);
      return res.status(500).json({ error: "Vision API failed to analyze image." });
    }
  });
}
