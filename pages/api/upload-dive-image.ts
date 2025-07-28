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

// Disable body parser so formidable can handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Validate environment variable
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("❌ Missing OPENAI_API_KEY in environment.");
  throw new Error("Missing OPENAI_API_KEY");
}

// Initialize OpenAI
const openai = new OpenAI({ apiKey });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    multiples: false,
    filter: ({ mimetype }) => {
      return !!mimetype && ["image/jpeg", "image/png"].includes(mimetype);
    },
  });

  form.parse(req, async (err, fields, files: Files) => {
    if (err) {
      console.error("❌ Formidable parsing error:", err);
      return res.status(400).json({ error: "Image upload failed during parsing." });
    }

    const fileEntry = extractUploadedFile(files);
    if (!fileEntry || !fileEntry.filepath) {
      console.error("❌ No valid file found in upload:", files);
      return res.status(400).json({ error: "No valid image file uploaded." });
    }

    try {
      const filePath = fileEntry.filepath;
      const mimeType = fileEntry.mimetype || "image/jpeg";
      const base64Image = fs.readFileSync(filePath).toString("base64");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
              You are a professional freediving coach analyzing uploaded dive profile images. The profile shows important data:
              - Depth (meters), Dive time, Ascent/descent rates, Turnaround time
              Extract these if visible, then give detailed coaching feedback:
              - Descent/ascent technique, pace changes, breath-hold strategy, safety, and next steps comparing to 1 meter per second as balance.
              If info is missing, ask for more details.
            `.trim(),
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
                text: "Please analyze this dive profile image and provide detailed coaching feedback.",
              },
            ],
          },
        ],
        max_tokens: 800,
      });

      const result = response.choices?.[0]?.message?.content || "⚠️ No insights generated.";

      // Clean up the uploaded file
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.warn("⚠️ Failed to delete uploaded file:", unlinkErr);
      });

      return res.status(200).json({ answer: result });
    } catch (error: any) {
      console.error("❌ OpenAI Vision error:", error?.message || error);
      return res.status(500).json({ error: "Failed to process image with OpenAI." });
    }
  });
}

// Helper to extract file from form
function extractUploadedFile(files: Files): File | undefined {
  const fileField = files.image || Object.values(files)[0];
  return Array.isArray(fileField) ? fileField[0] : fileField;
}
