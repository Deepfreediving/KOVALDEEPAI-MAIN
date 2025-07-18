import { upsertData } from "@lib/pinecone"; // Import the Pinecone upsert function

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Example data to be upserted to Pinecone
      const data = [
        {
          id: "example-id-1", // Unique identifier for the vector
          values: [0.1, 0.2, 0.3, 0.4], // Vector values (ensure they match the index dimensions)
        },
        {
          id: "example-id-2", // Another unique identifier
          values: [0.5, 0.6, 0.7, 0.8], // Corresponding vector values
        },
        // You can add more vectors here as needed
      ];

      // Call the upsert function from Pinecone to add the data to the index
      const response = await upsertData(data);

      // Return the response back to the client
      res.status(200).json({ success: true, data: response });
    } catch (error) {
      // Handle errors by returning an error response
      console.error("Error upserting data to Pinecone:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    // If the method is not POST, return a 405 Method Not Allowed
    res.status(405).json({ error: "Method Not Allowed" });
  }
}
