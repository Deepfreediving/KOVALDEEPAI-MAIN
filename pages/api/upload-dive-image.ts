import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, Files, File } from "formidable";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ Missing OPENAI_API_KEY");
  throw new Error("Missing OPENAI_API_KEY");
}

const openai = new OpenAI({ apiKey });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024,
    multiples: false,
    filter: ({ mimetype }) => ["image/jpeg", "image/png"].includes(mimetype || ""),
  });

  form.parse(req, async (err, fields, files: Files) => {
    if (err) {
      console.error("❌ Form parse error:", err);
      return res.status(400).json({ error: "Image upload parsing failed." });
    }

    const fileEntry = extractUploadedFile(files);
    if (!fileEntry || !fileEntry.filepath) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    try {
      const filePath = fileEntry.filepath;
      const mimeType = fileEntry.mimetype || "image/jpeg";
      const base64Image = fs.readFileSync(filePath, "base64");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: `
              You are a professional freediving coach.
              Analyze dive profile images showing:
              - Depth over time
              - Dive time
              - Ascent/descent rates
              - Turnaround point
              Provide coaching insights and suggestions.
            `,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
              {
                type: "text",
                text: "Please analyze this dive profile image and give coaching feedback.",
              },
            ],
          },
        ],
      });

      const result = response.choices?.[0]?.message?.content?.trim();

      fs.unlink(filePath, (err) => {
        if (err) console.warn("⚠️ Could not delete file:", err);
      });

      if (!result) {
        return res.status(200).json({ answer: "⚠️ Image uploaded, but no analysis returned." });
      }

      return res.status(200).json({ answer: result });
    } catch (error: any) {
      console.error("❌ OpenAI image analysis failed:", error?.message || error);
      return res.status(500).json({ error: "Image analysis failed. Try again or check image quality." });
    }
  });
}

// Helper to extract file safely
function extractUploadedFile(files: Files): File | undefined {
  const file = files.image || Object.values(files)[0];
  return Array.isArray(file) ? file[0] : file;
}
