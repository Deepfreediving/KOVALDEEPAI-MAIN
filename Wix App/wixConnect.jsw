import { fetch } from 'wix-fetch';
import wixData from 'wix-data';

const AI_BACKEND_URL = "https://kovaldeepai-main.vercel.app/api/chat-embed"; // ✅ LIVE DEPLOYMENT URL

/**
 * ✅ Safe JSON parsing utility
 */
async function safeJsonParse(response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (err) {
        console.error("❌ Failed to parse JSON:", text);
        return {};
    }
}

/**
 * ✅ Save a new dive log to the 'userMemory' collection
 */
export async function saveDiveLog(diveData) {
    try {
        return await wixData.insert("@deepfreediving/kovaldeepai-app/Import1", diveData);
    } catch (error) {
        console.error("❌ Error saving dive log:", error);
        throw new Error("Could not save dive log");
    }
}

/**
 * ✅ Retrieve all dive logs for a specific user
 */
export async function getDiveLogs(userId) {
    try {
        const results = await wixData.query("@deepfreediving/kovaldeepai-app/Import1")
            .eq("userId", userId)
            .find();
        return results.items || [];
    } catch (error) {
        console.error("❌ Error fetching dive logs:", error);
        return [];
    }
}

/**
 * ✅ Save AI memory snapshots (context, last logs, profile updates)
 */
export async function saveUserMemory(userId, memoryUpdate) {
    try {
        return await wixData.insert("@deepfreediving/kovaldeepai-app/Import1", {
            userId,
            type: "memory",
            timestamp: new Date().toISOString(),
            ...memoryUpdate
        });
    } catch (error) {
        console.error("❌ Error saving user memory:", error);
        return null;
    }
}

/**
 * ✅ Forward chat requests from Wix frontend to your deployed AI backend
 * 🔧 FIXED: Parameter name and response structure alignment
 */
export async function post_chat(request) {
    try {
        const { userMessage, userId, profile = {}, diveLogs = [] } = request.body;

        // ✅ Validate required inputs
        if (!userMessage?.trim()) {
            return {
                status: 400,
                body: {
                    error: 'Message is required',
                    success: false
                }
            };
        }

        // ✅ Retrieve dive logs if not provided
        let userDiveLogs = diveLogs;
        if (!userDiveLogs.length && userId) {
            userDiveLogs = await getDiveLogs(userId);
        }

        // ✅ Build profile context for AI
        const userProfile = {
            ...profile,
            totalDives: userDiveLogs.length,
            pb: userDiveLogs.reduce(
                (max, d) => Math.max(max, d.reachedDepth || d.targetDepth || 0),
                0
            ),
            lastDiveDepth: userDiveLogs[0]?.reachedDepth || userDiveLogs[0]?.targetDepth || 0,
            lastDiveLocation: userDiveLogs[0]?.location || "Unknown"
        };

        // 🔧 FIXED: Use 'message' instead of 'userMessage' to match backend API
        const payload = {
            message: userMessage,  // ✅ Changed from userMessage
            userId: userId || 'guest',
            profile: userProfile
        };

        console.log("🚀 Sending to AI backend:", payload);

        // ✅ Send query to Next.js AI backend
        const response = await fetch(AI_BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`❌ AI backend responded with status: ${response.status}`);
            return {
                status: response.status,
                body: {
                    error: `AI backend error: ${response.status}`,
                    success: false
                }
            };
        }

        const data = await safeJsonParse(response);
        console.log("📥 AI backend response:", data);

        // 🔧 FIXED: Handle the correct response structure from chat-embed.ts
        const aiResponse = data.assistantMessage?.content || 
                          data.answer || 
                          "⚠️ No response from AI.";

        return {
            status: 200,
            body: {
                aiResponse,
                metadata: {
                    ...data.metadata,
                    userProfile,
                    totalDiveLogs: userDiveLogs.length
                },
                success: true,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        console.error("❌ Chat function error:", error);
        return {
            status: 500,
            body: {
                error: 'Chat service error: ' + error.message,
                success: false,
                timestamp: new Date().toISOString()
            }
        };
    }
}

/**
 * ✅ Optional: Test connection to your AI backend
 */
export async function get_testConnection() {
    try {
        const response = await fetch(AI_BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "test connection",
                userId: "test-user",
                profile: { nickname: "Test User" }
            })
        });

        const data = await safeJsonParse(response);
        
        return {
            status: 200,
            body: {
                connected: response.ok,
                status: response.status,
                response: data,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        return {
            status: 500,
            body: {
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
}
