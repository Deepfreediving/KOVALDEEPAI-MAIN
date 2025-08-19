// pages/api/openai/create-thread.ts

import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import handleCors from "@/utils/handleCors";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID =
  process.env.OPENAI_ASSISTANT_ID || "asst_WnbEd7Jxgf1z2U0ziNWi8yz9";

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not configured");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || "" });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const startTime = Date.now();

  try {
    // Handle CORS
    await handleCors(req, res);

    if (req.method === "OPTIONS") return;

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    // Extract input
    const { username = "Guest", displayName = "Guest User" } = req.body;

    // Basic validation
    if (!username || !displayName) {
      return res.status(400).json({
        error: "Username and displayName are required",
      });
    }

    console.log(`🚀 Creating thread for: ${displayName}`);

    // Check if OpenAI is configured
    if (!OPENAI_API_KEY) {
      return res.status(200).json({
        threadId: `mock-${Date.now()}`,
        initialMessage: `👋 Hello ${displayName}, I'm your freediving AI coach. (Demo Mode)`,
        metadata: { mock: true, processingTime: Date.now() - startTime },
      });
    }

    // ✅ STEP 1: Create thread
    const thread = await openai.beta.threads.create({
      metadata: {
        createdBy: username,
        displayName: displayName,
        createdAt: new Date().toISOString(),
      },
    });

    console.log(`✅ Thread created: ${thread.id}`);

    // ✅ STEP 2: Add initial message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Hi, I'm ${displayName}. I'm ready to start our freediving coaching session.`,
    });

    // ✅ STEP 3: Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    console.log(`🤖 Started assistant run: ${run.id}`);

    // ✅ STEP 4: Simple polling (max 20 attempts)
    let attempts = 0;
    let runStatus = "in_progress";

    while (attempts < 20 && runStatus !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const updatedRun = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: thread.id,
      });

      runStatus = updatedRun.status;
      attempts++;

      console.log(`📊 Run status (${attempts}/20): ${runStatus}`);

      if (runStatus === "failed") {
        throw new Error("Assistant run failed");
      }

      if (runStatus === "cancelled" || runStatus === "expired") {
        throw new Error(`Assistant run ${runStatus}`);
      }
    }

    if (runStatus !== "completed") {
      throw new Error("Assistant run timed out");
    }

    // ✅ STEP 5: Get response
    const messages = await openai.beta.threads.messages.list(thread.id, {
      limit: 5,
    });

    const assistantMessage = messages.data.find((m) => m.role === "assistant");

    if (!assistantMessage) {
      throw new Error("No assistant response found");
    }

    // Extract text content
    const textContent = assistantMessage.content.find((c) => c.type === "text");
    const initialMessage =
      textContent?.type === "text"
        ? textContent.text.value
        : `👋 Hello ${displayName}! I'm Koval AI, your freediving coach. Let's begin!`;

    const processingTime = Date.now() - startTime;
    console.log(`✅ Thread completed in ${processingTime}ms`);

    return res.status(200).json({
      threadId: thread.id,
      initialMessage,
      metadata: {
        processingTime,
        assistantId: ASSISTANT_ID,
        success: true,
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Thread creation error:", error.message);

    // Return appropriate error
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes("API key")) {
      statusCode = 401;
      errorMessage = "OpenAI API key invalid";
    } else if (error.message.includes("rate limit")) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded";
    } else if (error.message.includes("assistant")) {
      statusCode = 400;
      errorMessage = "Invalid assistant configuration";
    }

    return res.status(statusCode).json({
      error: "Thread Creation Failed",
      message: errorMessage,
      metadata: {
        processingTime,
        success: false,
      },
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" },
    responseLimit: false,
    timeout: 30000,
  },
};
