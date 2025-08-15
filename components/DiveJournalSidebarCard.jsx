import { useState } from "react";
import DiveJournalDisplay from "./DiveJournalDisplay";

export default function DiveJournalSidebarCard({
  nickname,
  darkMode,
  onSubmit, // Called when dive log is saved
  onDelete, // Called when dive log is deleted
  diveLogs,
  // loadingDiveLogs, // Unused - removed to fix eslint warning
  // editLogIndex, // Unused - removed to fix eslint warning  
  // setEditLogIndex, // Unused - removed to fix eslint warning
  editingLog, // ✅ V5.0: Log being edited
  setEditingLog, // ✅ V5.0: Set editing log state
  setMessages, // For analysis integration
  onRefreshDiveLogs, // 🚀 NEW: To refresh dive logs in parent
  onEditDiveLog, // ✅ V5.0: Edit callback
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  // 🚀 Handle dive log save with parent communication
  const handleDiveLogSaved = async (diveLog, result) => {
    try {
      console.log(
        "✅ DiveJournalSidebarCard: Dive log saved callback triggered:",
        {
          diveLogId: diveLog.id,
          success: result.success,
          nickname: nickname,
        },
      );

      // Clear editing state after save
      if (setEditingLog) {
        setEditingLog(null);
      }

      // Call parent onSubmit callback if provided
      if (onSubmit) {
        await onSubmit(diveLog);
        console.log("✅ DiveJournalSidebarCard: Parent onSubmit completed");
      }

      // Trigger parent refresh if provided
      if (onRefreshDiveLogs) {
        console.log(
          "🔄 DiveJournalSidebarCard: Triggering parent dive logs refresh...",
        );
        await onRefreshDiveLogs();
      }

      // Update local refresh key to force DiveJournalDisplay to refresh
      setRefreshKey((prev) => prev + 1);

      console.log(
        "🎉 DiveJournalSidebarCard: All dive log save callbacks completed",
      );
    } catch (error) {
      console.error(
        "❌ DiveJournalSidebarCard: Error in dive log save callback:",
        error,
      );
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      {/* Header */}
      <div
        className={`border-b ${darkMode ? "border-gray-700" : "border-gray-200"} p-4`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            🤿 <span>Dive Journal</span>
          </h2>
        </div>
        {diveLogs && diveLogs.length > 0 && (
          <p
            className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            {diveLogs.length} dive{diveLogs.length !== 1 ? "s" : ""} logged
          </p>
        )}
      </div>

      {/* Content Area - Full DiveJournalDisplay */}
      <div className="flex-1 overflow-hidden">
        <DiveJournalDisplay
          key={refreshKey}
          refreshKey={refreshKey}
          nickname={nickname}
          darkMode={darkMode}
          isEmbedded={true}
          setMessages={setMessages}
          onDiveLogSaved={handleDiveLogSaved}
          onDiveLogDeleted={onDelete}
          onRefreshDiveLogs={onRefreshDiveLogs}
          editingLog={editingLog} // ✅ V5.0: Pass editing log
          onEditDiveLog={onEditDiveLog} // ✅ V5.0: Pass edit callback for SavedDiveLogsViewer
        />
      </div>
    </div>
  );
}
