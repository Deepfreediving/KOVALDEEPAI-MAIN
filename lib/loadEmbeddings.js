import axios from "axios";

// This function loads the documents, processes them, and upserts them to Pinecone
export const loadDocuments = async () => {
  try {
    // Fetch the list of .txt files from the API
    const { data } = await axios.get("/api/getAllTxtFiles");
    const files = data.files; // Get the list of files

    // Array to hold the embedded documents
    const embedded = [];

    // Loop through each file and process
    for (const file of files) {
      try {
        // Fetch the content of the file via the getFileText API
        const text = await fetchTextFromFile(file.fullPath);

        // Get the embedding for the text
        const embedding = await getEmbedding(text);

        // Add the document and its embedding to the array
        embedded.push({
          id: file.relativePath, // Use the relative file path as the unique ID
          values: embedding, // The embedding vector for the document
          metadata: { text }, // Include the original text as metadata
        });
      } catch (err) {
        console.error(`Error processing file ${file.relativePath}:`, err);
      }
    }

    console.log("📦 Prepared vectors for upsert:", embedded);

    // Ensure that the 'embedded' array is valid
    if (!Array.isArray(embedded)) {
      console.error("❌ 'embedded' is not an array. Value:", embedded);
      return;
    }

    // Upsert the documents to Pinecone (v1 SDK)
    const result = await index.upsert({ records: embedded });
    console.log("✅ Upsert complete:", result);
  } catch (error) {
    console.error("❌ Error loading documents:", error);
  }
};

// Helper function to fetch file content from the API
const fetchTextFromFile = async (filePath) => {
  try {
    const response = await fetch(`/api/getFileText?filePath=${filePath}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }
    const data = await response.json();
    return data.text; // Return the file content
  } catch (error) {
    console.error(`❌ Error fetching file content for ${filePath}:`, error);
    throw error; // Re-throw the error so it can be handled in the main flow
  }
};

// Placeholder for the getEmbedding function (make sure to implement this)
const getEmbedding = async (text) => {
  try {
    // Assuming there's an endpoint that returns embeddings for the provided text
    const response = await axios.post("/api/getEmbedding", { text });
    if (!response.data || !response.data.embedding) {
      throw new Error("No embedding returned from API");
    }
    return response.data.embedding;
  } catch (error) {
    console.error("❌ Error getting embedding:", error);
    throw error; // Rethrow the error for further handling
  }
};
