import type { NextApiRequest, NextApiResponse } from "next";
import handleCors from "@/utils/handleCors"; // ✅ ADD this import

// ✅ CORS headers
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // ✅ REPLACE existing CORS with handleCors
  await handleCors(req, res);

  if (req.method === "OPTIONS") return;

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      message: "Only POST requests allowed",
    });
  }

  try {
    const { service, action, data } = req.body;

    // ✅ Basic validation
    if (!service || !action) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Service and action are required",
      });
    }

    console.log(`📥 API Handler: ${service}/${action}`);

    // ✅ Route to appropriate service
    switch (service) {
      case "openai":
        return await handleOpenAI(action, data, res);

      case "wix":
        return await handleWix(action, data, res);

      default:
        return res.status(400).json({
          error: "Invalid service",
          message: `Service '${service}' not supported`,
        });
    }
  } catch (error) {
    console.error("❌ API Handler error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ✅ Handle OpenAI requests
async function handleOpenAI(action: string, data: any, res: NextApiResponse) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({
      error: "Configuration error",
      message: "OpenAI API key not configured",
    });
  }

  switch (action) {
    case "chat":
      try {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: data?.model || "gpt-4",
              messages: data?.messages || [
                { role: "user", content: data?.message || "Hello" },
              ],
              max_tokens: data?.maxTokens || 150,
              temperature: 0.7,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const result = await response.json();
        return res.status(200).json({
          success: true,
          data: result,
          assistantMessage: {
            role: "assistant",
            content: result.choices?.[0]?.message?.content || "No response",
          },
        });
      } catch (error) {
        console.error("❌ OpenAI chat error:", error);
        return res.status(500).json({
          error: "OpenAI request failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

    case "check":
      return res.status(200).json({
        success: true,
        data: { status: "connected", service: "openai" },
      });

    default:
      return res.status(400).json({
        error: "Invalid action",
        message: `Action '${action}' not supported for OpenAI`,
      });
  }
}

// ✅ Handle Wix requests
async function handleWix(action: string, data: any, res: NextApiResponse) {
  const WIX_API_KEY = process.env.WIX_API_KEY;
  const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID;
  const WIX_SITE_ID = process.env.WIX_SITE_ID;

  if (!WIX_API_KEY || !WIX_ACCOUNT_ID || !WIX_SITE_ID) {
    return res.status(500).json({
      error: "Configuration error",
      message: "Wix credentials not configured",
    });
  }

  switch (action) {
    case "queryData":
      try {
        const response = await fetch(
          "https://www.wixapis.com/wix-data/v2/items/query",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${WIX_API_KEY}`,
              "wix-account-id": WIX_ACCOUNT_ID,
              "wix-site-id": WIX_SITE_ID,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              collectionId: data?.collectionId || "UserMemory",
              query: data?.query || {},
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Wix API error: ${response.status}`);
        }

        const result = await response.json();
        return res.status(200).json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("❌ Wix query error:", error);
        return res.status(500).json({
          error: "Wix request failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }

    case "check":
      return res.status(200).json({
        success: true,
        data: { status: "connected", service: "wix" },
      });

    default:
      return res.status(400).json({
        error: "Invalid action",
        message: `Action '${action}' not supported for Wix`,
      });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};
