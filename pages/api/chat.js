const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { message, thread_id, username } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Optional: Debug logging
  console.log("Incoming message:", message);
  console.log("Thread ID:", thread_id || "(none)");
  console.log("Username:", username || "(guest)");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4", // Or "gpt-3.5-turbo" if you're using that
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant for ${username || "a guest user"}.`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const assistantReply = data.choices?.[0]?.message?.content || "⚠️ No response.";
      return res.status(200).json({
        assistantMessage: {
          role: "assistant",
          content: assistantReply,
        },
      });
    } else {
      console.error("OpenAI API error:", data.error);
      return res.status(response.status).json({
        error: data.error?.message || "Unknown OpenAI error",
      });
    }
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server encountered an error." });
  }
}
