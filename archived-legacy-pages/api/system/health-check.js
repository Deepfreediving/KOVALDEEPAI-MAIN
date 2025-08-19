// API Health Check and Integration Status
// pages/api/system/health-check.js

import handleCors from "@/utils/handleCors";

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  const startTime = Date.now();
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {},
    summary: {
      healthy: 0,
      warning: 0,
      error: 0,
    },
  };

  // Helper function to add check result
  const addCheck = (
    name,
    status,
    message,
    responseTime = null,
    data = null,
  ) => {
    healthStatus.checks[name] = {
      status,
      message,
      responseTime,
      data,
    };
    healthStatus.summary[status]++;
  };

  try {
    // 1. Check OpenAI API
    try {
      const openaiStart = Date.now();
      const openaiTest = await fetch(`${req.headers.origin}/api/openai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "health check",
          userId: "health-test",
          profile: {},
          embedMode: true,
        }),
      });

      const openaiTime = Date.now() - openaiStart;

      if (openaiTest.ok) {
        addCheck(
          "openai-chat",
          "healthy",
          "OpenAI chat API responding",
          openaiTime,
        );
      } else {
        addCheck(
          "openai-chat",
          "warning",
          `OpenAI chat returned ${openaiTest.status}`,
          openaiTime,
        );
      }
    } catch (openaiError) {
      addCheck(
        "openai-chat",
        "error",
        `OpenAI chat failed: ${openaiError.message}`,
      );
    }

    // 2. Check Pinecone API
    try {
      const pineconeStart = Date.now();
      const pineconeTest = await fetch(
        `${req.headers.origin}/api/pinecone/pineconequery-gpt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "health check",
            returnChunks: true,
          }),
        },
      );

      const pineconeTime = Date.now() - pineconeStart;

      if (pineconeTest.ok) {
        addCheck(
          "pinecone-query",
          "healthy",
          "Pinecone API responding",
          pineconeTime,
        );
      } else {
        addCheck(
          "pinecone-query",
          "warning",
          `Pinecone returned ${pineconeTest.status}`,
          pineconeTime,
        );
      }
    } catch (pineconeError) {
      addCheck(
        "pinecone-query",
        "error",
        `Pinecone failed: ${pineconeError.message}`,
      );
    }

    // 3. Check Wix Backend Endpoints (original names)
    const wixMasterEndpoints = [
      {
        name: "wix-chat",
        url: "https://www.deepfreediving.com/_functions/http-chat",
      },
      {
        name: "wix-divelogs",
        url: "https://www.deepfreediving.com/_functions/http-diveLogs",
      },
      {
        name: "wix-userprofile",
        url: "https://www.deepfreediving.com/_functions/http-getUserProfile",
      },
      {
        name: "wix-usermemory",
        url: "https://www.deepfreediving.com/_functions/http-userMemory",
      },
    ];

    for (const endpoint of wixMasterEndpoints) {
      try {
        const wixStart = Date.now();
        const wixTest = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Source": "health-check",
          },
          body: JSON.stringify({
            action: "healthCheck",
            version: "v4.0",
          }),
        });

        const wixTime = Date.now() - wixStart;

        if (wixTest.ok) {
          addCheck(
            endpoint.name,
            "healthy",
            "Wix master endpoint responding",
            wixTime,
          );
        } else {
          addCheck(
            endpoint.name,
            "warning",
            `Wix master returned ${wixTest.status}`,
            wixTime,
          );
        }
      } catch (wixError) {
        addCheck(
          endpoint.name,
          "error",
          `Wix master failed: ${wixError.message}`,
        );
      }
    }

    // 4. Check Bridge APIs
    try {
      const bridgeStart = Date.now();
      const bridgeTest = await fetch(
        `${req.headers.origin}/api/wix/dive-logs-bridge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "health-test" }),
        },
      );

      const bridgeTime = Date.now() - bridgeStart;

      if (bridgeTest.ok) {
        addCheck(
          "dive-logs-bridge",
          "healthy",
          "Dive logs bridge responding",
          bridgeTime,
        );
      } else {
        addCheck(
          "dive-logs-bridge",
          "warning",
          `Bridge returned ${bridgeTest.status}`,
          bridgeTime,
        );
      }
    } catch (bridgeError) {
      addCheck(
        "dive-logs-bridge",
        "error",
        `Bridge failed: ${bridgeError.message}`,
      );
    }

    // 5. Check Environment Variables
    const requiredEnvVars = [
      "OPENAI_API_KEY",
      "PINECONE_API_KEY",
      "PINECONE_INDEX",
      "WIX_API_KEY",
    ];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar],
    );

    if (missingEnvVars.length === 0) {
      addCheck(
        "environment",
        "healthy",
        "All required environment variables configured",
        null,
        {
          configuredVars: requiredEnvVars.length,
        },
      );
    } else {
      addCheck(
        "environment",
        "error",
        `Missing environment variables: ${missingEnvVars.join(", ")}`,
        null,
        {
          missing: missingEnvVars,
        },
      );
    }

    // 6. Overall Status Determination
    if (healthStatus.summary.error > 0) {
      healthStatus.status = "error";
    } else if (healthStatus.summary.warning > 0) {
      healthStatus.status = "warning";
    } else {
      healthStatus.status = "healthy";
    }

    const totalTime = Date.now() - startTime;
    healthStatus.totalResponseTime = totalTime;

    // Log health check results
    console.log(`🏥 Health check completed in ${totalTime}ms:`, {
      status: healthStatus.status,
      healthy: healthStatus.summary.healthy,
      warnings: healthStatus.summary.warning,
      errors: healthStatus.summary.error,
    });

    // Return appropriate HTTP status
    const httpStatus =
      healthStatus.status === "healthy"
        ? 200
        : healthStatus.status === "warning"
          ? 207
          : 503;

    return res.status(httpStatus).json(healthStatus);
  } catch (error) {
    console.error("❌ Health check failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Health check system failure",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
    responseLimit: false,
    timeout: 30000,
  },
};
