import formidable from "formidable";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

// Ensure /uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const form = new formidable.IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("❌ Form parse error:", err);
      return res.status(400).json({ error: "Image upload failed (form error)" });
    }

    console.log("📦 Files received:", files);

    try {
      const fileEntry = Array.isArray(files.image)
        ? files.image[0]
        : files.image || Object.values(files)[0];

      if (!fileEntry || !fileEntry.filepath) {
        console.error("❌ No valid image file found in:", fileEntry);
        return res.status(400).json({ error: "No valid image file received" });
      }

      const filePath = fileEntry.filepath || fileEntry.path;
      const fileData = fs.readFileSync(filePath);
      const base64Image = fileData.toString("base64");

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a freediving coach analyzing dive profile images. Provide helpful and precise feedback based only on what you see.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${fileEntry.mimetype};base64,${base64Image}`,
                },
              },
              {
                type: "text",
                text: "Please analyze this dive profile image and give coaching feedback or observations.",
              },
            ],
          },
        ],
        max_tokens: 800,
      });

      const result = response.choices?.[0]?.message?.content || "No response returned.";

      // Clean up
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.warn("⚠️ Could not delete uploaded file:", unlinkErr);
      });

      return res.status(200).json({ answer: result });
    } catch (error) {
      console.error("❌ OpenAI Vision processing error:", error);
      return res.status(500).json({ error: "Failed to analyze image with OpenAI." });
    }
  });
}
