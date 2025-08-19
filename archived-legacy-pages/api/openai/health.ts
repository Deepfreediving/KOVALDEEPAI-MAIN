import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import handleCors from "@/utils/handleCors";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await handleCors(req, res);
    if (req.method === "OPTIONS") return;
    if (req.method !== "GET")
      return res.status(405).json({ error: "Method Not Allowed" });

    const startTime = Date.now();

    // ✅ Check if OpenAI is configured
    if (!OPENAI_API_KEY || !openai) {
      return res.status(200).json({
        status: "error",
        error: "OpenAI not configured",
        configured: false,
        responseTime: Date.now() - startTime,
      });
    }

    try {
      // ✅ Simple health check with minimal API usage
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      // ✅ Use a lightweight models list call instead of completions
      const response = await openai.models.list();
      clearTimeout(timeoutId);

      if (response && response.data && Array.isArray(response.data)) {
        const models = response.data.map((model) => model.id);
        const hasGPT4 = models.some((id) => id.includes("gpt-4"));

        return res.status(200).json({
          status: "healthy",
          configured: true,
          model: hasGPT4 ? "gpt-4" : "available",
          quotaStatus: "active",
          responseTime: Date.now() - startTime,
          modelsCount: models.length,
        });
      } else {
        return res.status(200).json({
          status: "warning",
          configured: true,
          error: "Unexpected response format",
          responseTime: Date.now() - startTime,
        });
      }
    } catch (openaiError: any) {
      console.error("❌ OpenAI health check error:", openaiError.message);

      // ✅ Classify the error
      let status = "error";
      let errorType = "unknown";

      if (openaiError.code === "insufficient_quota") {
        status = "error";
        errorType = "quota_exceeded";
      } else if (openaiError.code === "rate_limit_exceeded") {
        status = "warning";
        errorType = "rate_limited";
      } else if (openaiError.code === "invalid_api_key") {
        status = "error";
        errorType = "auth_failed";
      } else if (openaiError.name === "AbortError") {
        status = "warning";
        errorType = "timeout";
      } else if (openaiError.status >= 500) {
        status = "warning";
        errorType = "server_error";
      }

      return res.status(200).json({
        status,
        configured: true,
        error: openaiError.message,
        errorType,
        errorCode: openaiError.code,
        responseTime: Date.now() - startTime,
      });
    }
  } catch (error: any) {
    console.error("❌ Health check handler error:", error);
    return res.status(500).json({
      status: "error",
      error: "Health check failed",
      details: error.message,
    });
  }
}

export const config = {
  api: {
    timeout: 10000, // 10 second timeout
  },
};
