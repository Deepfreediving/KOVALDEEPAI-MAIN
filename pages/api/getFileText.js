import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const { filePath } = req.query; // Get the file path from the query parameter

  try {
    // Read the file content
    const fileContent = fs.readFileSync(
      path.join(process.cwd(), filePath),
      "utf-8",
    );
    res.status(200).json({ text: fileContent }); // Return the file content
  } catch (error) {
    console.error("Error reading file content:", error);
    res.status(500).json({ error: "Error reading file content" });
  }
}
