// pages/api/analyze-upload-image.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, Files, File } from "formidable";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ Missing OPENAI_API_KEY");
  throw new Error("Missing OPENAI_API_KEY");
}

const openai = new OpenAI({ apiKey });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST requests are allowed." });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5 MB limit
      multiples: false,
      filter: ({ mimetype }) => ["image/jpeg", "image/png"].includes(mimetype || ""),
    });

    form.parse(req, async (err, fields, files: Files) => {
      if (err) {
        console.error("❌ Form parse error:", err);
        return res.status(400).json({ error: "Failed to parse uploaded file." });
      }

      const fileEntry = extractUploadedFile(files);
      if (!fileEntry?.filepath) {
        return res.status(400).json({ error: "No valid image file uploaded." });
      }

      const filePath = fileEntry.filepath;
      const mimeType = fileEntry.mimetype || "image/jpeg";

      try {
        const base64Image = fs.readFileSync(filePath, "base64");

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o", // Multimodal model for image analysis
          max_tokens: 800,
          messages: [
            {
              role: "system",
              content: "You are a professional freediving coach analyzing dive profiles.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze this dive profile image and provide coaching feedback. Include observations on descent, ascent, and any visible inefficiencies.",
                },
                {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64Image}` },
                },
              ],
            },
          ],
        });

        const result = aiResponse.choices?.[0]?.message?.content?.trim();

        // Cleanup temp file
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.warn("⚠️ Failed to delete temp file:", unlinkErr.message);
        });

        return res.status(200).json({
          success: true,
          answer: result || "⚠️ Image uploaded, but no coaching feedback was returned.",
        });

      } catch (error: any) {
        console.error("❌ OpenAI image analysis failed:", error?.message || error);

        // Cleanup temp file on error
        fs.unlink(filePath, () => {});
        return res.status(500).json({
          error: "Image analysis failed. Please try again or check image format.",
        });
      }
    });
  } catch (globalErr: any) {
    console.error("❌ Unexpected server error:", globalErr.message || globalErr);
    return res.status(500).json({ error: "Unexpected error while processing image." });
  }
}

function extractUploadedFile(files: Files): File | undefined {
  const file = files.image || Object.values(files)[0];
  return Array.isArray(file) ? file[0] : file;
}
