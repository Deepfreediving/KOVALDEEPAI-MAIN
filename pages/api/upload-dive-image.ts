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

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

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

  form.parse(req, async (err: any, fields: any, files: Files) => {
    if (err) {
      console.error("❌ Form parse error:", err);
      return res.status(400).json({ error: "Image upload failed (form error)." });
    }

    const fileEntry = extractUploadedFile(files);

    if (!fileEntry || !fileEntry.filepath) {
      console.error("❌ Invalid file received:", fileEntry);
      return res.status(400).json({ error: "No valid image file uploaded." });
    }

    const filePath = fileEntry.filepath;
    const mimeType = fileEntry.mimetype || "image/jpeg";

    try {
      // Read the image file into a buffer and encode as base64
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString("base64");

      // Call OpenAI's image analysis API with the updated system prompt
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
              You are a professional freediving coach analyzing uploaded dive profile images. The profile shows important data, including:
              - Depth (meters)
              - Dive time (minutes and seconds)
              - Ascent and descent rates
              - Turnaround time at depth
              You should extract these details if they are visible in the image, and provide a detailed coaching summary with actionable feedback.

              Key points to address in your analysis:
              - Descent and ascent techniques
              - Pace of the dive and efficiency
              - Relaxation and breath-hold strategies
              - Safety considerations
              - Recommendations for future dives based on performance

              If the image does not contain necessary information like depth or time, indicate that the information is missing and ask for more details if needed.
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

      const result = response.choices?.[0]?.message?.content || "No insights generated.";

      // Clean up uploaded file after processing
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.warn("⚠️ File cleanup failed:", unlinkErr.message);
        }
      });

      return res.status(200).json({ answer: result });
    } catch (error: any) {
      console.error("❌ OpenAI Vision processing error:", error?.message || error);
      return res.status(500).json({ error: "Failed to analyze image with OpenAI." });
    }
  });
}

// 🔧 Helper: Extract file from files object
function extractUploadedFile(files: Files): File | undefined {
  const fileField = files.image || Object.values(files)[0];
  return Array.isArray(fileField) ? fileField[0] : fileField;
}
