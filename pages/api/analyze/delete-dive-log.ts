import type { NextApiRequest, NextApiResponse } from "next";
import handleCors from "@/utils/handleCors";
import { deleteLogEntry } from "@/utils/diveLogHelpers";

interface DeleteDiveLogRequest {
  userId: string;
  logId: string;
  wixId?: string; // Wix _id for DiveLogs collection
  source?: string;
}

interface DeleteDiveLogResponse {
  success: boolean;
  message: string;
  deletedId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteDiveLogResponse>,
) {
  try {
    // ✅ Handle CORS
    if (handleCors(req, res)) return;

    if (req.method !== "DELETE") {
      return res.status(405).json({
        success: false,
        message: "Method not allowed",
        error: "Only DELETE requests are supported",
      });
    }

    const {
      userId,
      logId,
      wixId,
      source = "dive-journal",
    }: DeleteDiveLogRequest = req.body;

    console.log(`🗑️ DELETE DIVE LOG: Starting delete process`, {
      userId,
      logId,
      wixId,
      source,
      timestamp: new Date().toISOString(),
    });

    // Validate required fields
    if (!userId || !logId) {
      console.error("❌ DELETE DIVE LOG: Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId and logId are required",
        error: "MISSING_FIELDS",
      });
    }

    // 📁 Delete from both local files and Wix using helper function
    try {
      const deleteResult = await deleteLogEntry(userId, logId);

      console.log(
        `✅ DELETE DIVE LOG: Delete operation completed`,
        deleteResult,
      );

      return res.status(200).json({
        success: deleteResult.success,
        message: deleteResult.success
          ? "Dive log deleted successfully"
          : "Failed to delete dive log",
        deletedId: logId,
      });
    } catch (deleteError) {
      console.error(
        `❌ DELETE DIVE LOG: Delete operation failed:`,
        deleteError,
      );

      return res.status(500).json({
        success: false,
        message: "Failed to delete dive log",
        error:
          deleteError instanceof Error ? deleteError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("❌ DELETE DIVE LOG: Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete dive log",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
