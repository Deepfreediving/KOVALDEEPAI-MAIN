import fs from "fs";
import path from "path";
import handleCors from "@/utils/handleCors"; // ✅ CHANGED from cors to handleCors

const directory = path.join(process.cwd(), "data"); // Ensure this points to your 'data' directory

export default async function handler(req, res) {
  try {
    // ✅ Use handleCors
    if (handleCors(req, res)) return; // Early exit for OPTIONS

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const files = fs.readdirSync(directory); // Read all files in the 'data' directory
    const txtFiles = files.filter((file) => file.endsWith(".txt")); // Filter only `.txt` files

    const fileDetails = txtFiles.map((file) => ({
      fullPath: path.join(directory, file), // Full path to the file
      relativePath: file, // Relative path for the file
    }));

    res.status(200).json({ files: fileDetails }); // Return the list of files as JSON
  } catch (error) {
    console.error("❌ Get all txt files error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
