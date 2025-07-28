import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, Files, File } from "formidable";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disable Next.js body parser to allow multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Ensure OpenAI API key is available
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ Missing OPENAI_API_KEY");
  throw new Error("Missing OPENAI_API_KEY");
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    multiples: false,
    filter: ({ mimetype }) => {
      return !!mimetype && ["image/jpeg", "image/png"].includes(mimetype);
    },
  });

  form.parse(req, async (err, fields, files: Files) => {
    if (err) {
      console.error("❌ Form parsing failed:", err);
      return res.status(400).json({ error: "Image upload parsing failed." });
    }

    const fileEntry = extractUploadedFile(files);
    if (!fileEntry || !fileEntry.filepath) {
      return res.status(400).json({ error: "No valid image file uploaded." });
    }

    try {
      const filePath = fileEntry.filepath;
      const mimeType = fileEntry.mimetype || "image/jpeg";
      const base64Image = fs.readFileSync(filePath).toString("base64");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: `
              You are a professional freediving coach analyzing uploaded dive profile images.
              The profile shows important data like:
              - Depth (meters)
              - Dive time
              - Ascent/descent rate
              - Turnaround time
              
              Extract this data if visible. Then give coaching feedback:
              - Pacing, descent/ascent technique, breath strategy, and any red flags.
              If unclear, ask the diver to clarify what the graph shows.
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
                text: "Please analyze this dive profile image and provide coaching insights.",
              },
            ],
          },
        ],
      });

      const result = response.choices?.[0]?.message?.content || "⚠️ No analysis produced.";

      // Clean up temporary file
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.warn("⚠️ Failed to delete image:", unlinkErr);
      });

      return res.status(200).json({ answer: result });
    } catch (error: any) {
      console.error("❌ OpenAI processing failed:", error?.message || error);
      return res.status(500).json({ error: "Failed to process image with OpenAI." });
    }
  });
}

// Utility to extract the uploaded file safely
function extractUploadedFile(files: Files): File | undefined {
  const fileField = files.image || Object.values(files)[0];
  return Array.isArray(fileField) ? fileField[0] : fileField;
}
