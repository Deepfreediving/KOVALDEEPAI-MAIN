import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const directory = path.join(process.cwd(), "data"); // Set the directory path here

  try {
    const files = fs.readdirSync(directory); // Read all files in the 'data' directory
    const txtFiles = files.filter((file) => file.endsWith(".txt")); // Filter only `.txt` files

    const fileDetails = txtFiles.map((file) => ({
      fullPath: path.join(directory, file), // Full path to the file
      relativePath: file, // Relative path for the file
    }));

    res.status(200).json({ files: fileDetails }); // Return the list of files as JSON
  } catch (error) {
    console.error("Error reading files:", error);
    res.status(500).json({ error: "Error reading files" });
  }
}
