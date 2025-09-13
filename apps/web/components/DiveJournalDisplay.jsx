import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

export default function DiveJournalDisplay({
  darkMode,
  isOpen,
  onClose,
  isEmbedded = false,
  setMessages,
  editingLog = null,
  diveLogs = [],
  loadingDiveLogs = false,
  // Batch analysis props from parent with safe defaults
  batchAnalysis = null,
  setBatchAnalysis = () => {},
  isAnalyzing = false,
  analysisType = "pattern",
  setAnalysisType = () => {},
  timeRange = "month",
  setTimeRange = () => {},
  analysisHistory = [],
  analyzingLogId = null,
  filters = { discipline: "", location: "", dateFrom: "", dateTo: "", hasIssues: "" },
  setFilters = () => {},
  // Data management functions from parent
  onBatchAnalysis,
  onAnalyzeDiveLog,
  onDeleteDiveLog,
  onExportLogs,
  onDiveLogSubmit
}) {
  const [logs, setLogs] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [activeTab, setActiveTab] = useState("saved-logs"); // Tab navigation: saved-logs, add-new, batch-analysis
  const [isSaving, setIsSaving] = useState(false); // Loading state for save operation

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    disciplineType: "depth",
    discipline: "CWT", // ✅ Default to valid enum value
    location: "",
    targetDepth: "",
    reachedDepth: "",
    mouthfillDepth: "",
    issueDepth: "",
    issueComment: "",
    squeeze: false,
    exit: "clean", // ✅ Default to valid enum value
    durationOrDistance: "",
    totalDiveTime: "",
    attemptType: "", // ✅ Empty = NULL (valid)
    surfaceProtocol: "", // ✅ Empty = NULL (valid)
    notes: "",
    imageFile: null,
    imagePreview: null,
    diveComputerFile: null,
    diveComputerFileName: "",
    // Advanced fields
    bottomTime: "",
    earSqueeze: false,
    lungSqueeze: false,
    narcosisLevel: "",
    recoveryQuality: "",
    gear: {
      wetsuit: "",
      fins: "",
      mask: "",
      weights_kg: "",
      nose_clip: false,
      lanyard: false,
      computer: ""
    }
  });
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're editing

  // Safe preview helper to avoid substring on non-string values
  const safePreview = (value, maxLen = 100) => {
    try {
      if (value === null || value === undefined) return "";
      if (typeof value === "string") {
        return value.length > maxLen ? value.substring(0, maxLen) + "..." : value;
      }
      if (typeof value === "object") {
        const s = JSON.stringify(value);
        return s.length > maxLen ? s.substring(0, maxLen) + "..." : s;
      }
      const s = String(value);
      return s.length > maxLen ? s.substring(0, maxLen) + "..." : s;
    } catch (e) {
      return "";
    }
  };

  // ✅ Helper function to map database fields to form fields
  const mapLogToFormEntry = (log) => {
    return {
      // Basic fields (support both formats)
      date: log.date,
      disciplineType: log.disciplineType || log.discipline_type || "depth",
      discipline: log.discipline || "CWT",
      location: log.location || "",
      
      // Depth fields (handle both snake_case and camelCase)
      targetDepth: log.targetDepth || log.target_depth || "",
      reachedDepth: log.reachedDepth || log.reached_depth || "",
      mouthfillDepth: log.mouthfillDepth || log.mouthfill_depth || "",
      issueDepth: log.issueDepth || log.issue_depth || "",
      
      // Time fields
      totalDiveTime: log.totalDiveTime || log.total_dive_time || "",
      durationOrDistance: log.durationOrDistance || log.duration_or_distance || "",
      bottomTime: log.bottomTime || log.bottom_time || "",
      
      // Issue fields
      issueComment: log.issueComment || log.issue_comment || "",
      squeeze: log.squeeze || false,
      
      // Performance fields
      exit: log.exit || "clean",
      attemptType: log.attemptType || log.attempt_type || "",
      surfaceProtocol: log.surfaceProtocol || log.surface_protocol || "",
      
      // Advanced fields
      earSqueeze: log.earSqueeze || log.ear_squeeze || false,
      lungSqueeze: log.lungSqueeze || log.lung_squeeze || false,
      narcosisLevel: log.narcosisLevel || log.narcosis_level || "",
      recoveryQuality: log.recoveryQuality || log.recovery_quality || "",
      
      // Notes
      notes: log.notes || "",
      
      // Image handling - check ai_analysis field for saved image data
      imageFile: null,
      imagePreview: log.imageUrl || log.image_url || log.ai_analysis?.imageUrl || null,
      diveComputerFile: null,
      diveComputerFileName: log.ai_analysis?.diveComputerFileName || "",
      
      // Gear (handle nested object or flat fields)
      gear: {
        wetsuit: log.gear?.wetsuit || log.wetsuit || "",
        fins: log.gear?.fins || log.fins || "",
        mask: log.gear?.mask || log.mask || "",
        weights_kg: log.gear?.weights_kg || log.weights_kg || "",
        nose_clip: log.gear?.nose_clip || log.nose_clip || false,
        lanyard: log.gear?.lanyard || log.lanyard || false,
        computer: log.gear?.computer || log.computer || ""
      }
    };
  };

  // ✅ Handle editing mode - pre-fill form when editingLog is provided
  useEffect(() => {
    if (editingLog) {
      console.log(
        "📝 DiveJournalDisplay: Entering edit mode for log:",
        editingLog.id,
        editingLog
      );
      
      const mappedEntry = mapLogToFormEntry(editingLog);
      console.log("📝 Mapped form entry:", mappedEntry);
      setNewEntry(mappedEntry);
      setIsEditMode(true);
      setActiveTab("add-new"); // Switch to form tab
    } else {
      setIsEditMode(false);
    }
  }, [editingLog]);

  // Update logs when parent passes new data
  useEffect(() => {
    setLogs(diveLogs);
  }, [diveLogs]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Handle gear object updates
    if (name.startsWith('gear.')) {
      const gearField = name.split('.')[1];
      setNewEntry((prev) => ({
        ...prev,
        gear: {
          ...prev.gear,
          [gearField]: type === "checkbox" ? checked : value,
        }
      }));
    } else {
      setNewEntry((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("📸 Image file selected:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`File too large! Maximum size is ${maxSize / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert(`Invalid file type! Allowed types: ${allowedTypes.join(', ')}`);
        return;
      }

      setNewEntry((prev) => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      }));

      console.log("✅ Image file ready for upload");

      // ✅ NEW: Auto-analyze image and populate form fields
      try {
        console.log("🔍 Starting immediate image analysis...");
        const formData = new FormData();
        formData.append("image", file);
        formData.append("userId", "temp-analysis"); // Temporary ID for analysis

        const uploadResp = await fetch("/api/dive/upload-image", {
          method: "POST",
          body: formData,
        });

        if (uploadResp.ok) {
          const uploadJson = await uploadResp.json();
          console.log("📊 Image analysis complete:", uploadJson);

          // Store the analyzed image data for later association with the dive log
          setNewEntry((prev) => ({
            ...prev,
            // Store the temporary image analysis data for later proper upload
            _tempImageData: {
              imageId: uploadJson?.data?.imageId,
              imageUrl: uploadJson?.data?.imageUrl,
              extractedMetrics: uploadJson?.data?.extractedMetrics,
              imageAnalysis: uploadJson?.data?.profileAnalysis,
            },
          }));

          // Populate form fields with extracted metrics
          if (uploadJson?.data?.extractedMetrics) {
            const metrics = uploadJson.data.extractedMetrics;
            console.log("🎯 Populating form with extracted metrics:", metrics);

            setNewEntry((prev) => ({
              ...prev,
              // Map extracted metrics to form fields
              ...(metrics.max_depth && { targetDepth: metrics.max_depth, reachedDepth: metrics.max_depth }),
              ...(metrics.dive_time_formatted && { totalDiveTime: metrics.dive_time_formatted }),
              ...(metrics.temperature && { waterTemperature: metrics.temperature }),
              ...(metrics.dive_date && { date: metrics.dive_date }),
              // Store extracted metrics for reference
              _extractedMetrics: metrics,
              _imageAnalysis: uploadJson.data.imageAnalysis,
            }));

            // Show comprehensive success message with all extracted metrics
            let analysisMessage = `🎯 **Image Analysis Complete**\n\n**BASIC METRICS:**\n- **Depth**: ${metrics.max_depth || 'N/A'}m\n- **Time**: ${metrics.dive_time_formatted || 'N/A'}\n- **Temperature**: ${metrics.temperature || 'N/A'}\n- **Date**: ${metrics.dive_date || 'N/A'}`;
            
            // Add advanced metrics if available
            if (metrics.descent_time || metrics.ascent_time || metrics.descent_rate || metrics.ascent_rate || metrics.hang_time) {
              analysisMessage += `\n\n**ADVANCED METRICS:**`;
              if (metrics.descent_time) analysisMessage += `\n- **Descent Time**: ${metrics.descent_time}`;
              if (metrics.ascent_time) analysisMessage += `\n- **Ascent Time**: ${metrics.ascent_time}`;
              if (metrics.descent_rate) analysisMessage += `\n- **Descent Rate**: ${metrics.descent_rate} m/min`;
              if (metrics.ascent_rate) analysisMessage += `\n- **Ascent Rate**: ${metrics.ascent_rate} m/min`;
              if (metrics.hang_time) analysisMessage += `\n- **Hang Time**: ${metrics.hang_time}s`;
            }
            
            // Add profile observations if available
            if (metrics.observations) {
              analysisMessage += `\n\n**PROFILE ANALYSIS:**\n${metrics.observations}`;
            }
            
            // Add confidence score if available
            if (metrics.confidence) {
              const confidencePercent = Math.round(metrics.confidence * 100);
              analysisMessage += `\n\n**Confidence**: ${confidencePercent}%`;
            }
            
            analysisMessage += `\n\nForm fields have been automatically populated. Please review and adjust as needed.`;

            setMessages?.((prev) => [
              ...prev,
              {
                role: "assistant",
                content: analysisMessage,
              },
            ]);
          } else {
            console.warn("⚠️ No metrics extracted from image");
            setMessages?.((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "📸 **Image Uploaded**\n\nImage analysis complete, but no dive metrics could be extracted automatically. Please fill in the form manually.",
              },
            ]);
          }
        } else {
          throw new Error(`Analysis failed: ${uploadResp.status}`);
        }
      } catch (error) {
        console.error("❌ Image analysis error:", error);
        setMessages?.((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ **Analysis Warning**\n\nImage uploaded but automatic analysis failed: ${error.message}\n\nYou can still fill in the form manually and save the dive log.`,
          },
        ]);
      }
    } else {
      console.log("❌ No file selected");
    }
  };

  // ✅ Bridge submit handler: delegate to parent controller only
  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSaving(true);

    // Minimal validation for UX
    if (!newEntry.date) {
      setMessages?.((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ **Validation Error**\n\nDate field is required. Please fill in all required fields.",
        },
      ]);
      setIsSaving(false);
      return;
    }

    try {
      if (onDiveLogSubmit) {
        const result = await onDiveLogSubmit(newEntry, isEditMode, editingLog);
        if (result?.success !== false) {
          // Reset form and optionally close
          resetForm();
          if (onClose && !isEmbedded) {
            setTimeout(() => onClose(), 300);
          }
          if (isEmbedded) setActiveTab("saved-logs");
        }
      } else {
        console.warn("onDiveLogSubmit prop not provided");
        setMessages?.((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "❌ **Configuration Error**\n\nDive log submission handler not configured.",
          },
        ]);
      }
    } catch (error) {
      console.error("DiveJournalDisplay: Submit error", error);
      setMessages?.((prev) => [
        ...prev,
        { role: "assistant", content: `❌ **Submit Failed**\n\n${error.message}` },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewEntry({
      date: new Date().toISOString().split("T")[0],
      disciplineType: "depth",
      discipline: "CWT",
      location: "",
      targetDepth: "",
      reachedDepth: "",
      mouthfillDepth: "",
      issueDepth: "",
      issueComment: "",
      squeeze: false,
      exit: "clean",
      durationOrDistance: "",
      totalDiveTime: "",
      attemptType: "",
      surfaceProtocol: "",
      notes: "",
      imageFile: null,
      imagePreview: null,
      diveComputerFile: null,
      diveComputerFileName: "",
      // Advanced fields
      bottomTime: "",
      earSqueeze: false,
      lungSqueeze: false,
      narcosisLevel: "",
      recoveryQuality: "",
      gear: {
        wetsuit: "",
        fins: "",
        mask: "",
        weights_kg: "",
        nose_clip: false,
        lanyard: false,
        computer: ""
      }
    });
    setIsEditMode(false);
  };

  // ✅ Delegate all data operations to parent controller
  const handleBatchAnalysis = useCallback(async () => {
    if (onBatchAnalysis) return onBatchAnalysis();
    console.warn("onBatchAnalysis prop not provided");
  }, [onBatchAnalysis]);

  const handleExportLogs = useCallback(async () => {
    if (onExportLogs) return onExportLogs();
    console.warn("onExportLogs prop not provided");
  }, [onExportLogs]);

  const handleAnalyzeDiveLog = async (log) => {
    if (onAnalyzeDiveLog) return onAnalyzeDiveLog(log);
    console.warn("onAnalyzeDiveLog prop not provided");
  };

  const handleDeleteDiveLog = async (logToDelete) => {
    if (!logToDelete || !logToDelete.id) return;
    if (
      !confirm(
        `Are you sure you want to delete the dive log from ${logToDelete.date} at ${logToDelete.location || "unknown location"}?`,
      )
    ) {
      return;
    }
    if (onDeleteDiveLog) return onDeleteDiveLog(logToDelete);
    console.warn("onDeleteDiveLog prop not provided");
  };

  // If not open and not embedded, don't render
  if (!isEmbedded && !isOpen) return null;

  // Sort logs
  const sortedLogs = [...logs].sort((a, b) => {
    switch (sortBy) {
      case "depth":
        return (b.reachedDepth || 0) - (a.reachedDepth || 0);
      case "location":
        return (a.location || "").localeCompare(b.location || "");
      default: // date
        return new Date(b.date) - new Date(a.date);
    }
  });

  if (isEmbedded) {
    return (
      <div className="h-full flex flex-col">
        {/* Tab Navigation for Embedded */}
        <div
          className={`border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}
        >
          <div className="flex">
            <button
              onClick={() => setActiveTab("saved-logs")}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "saved-logs"
                  ? darkMode
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "bg-blue-500 text-white border-b-2 border-blue-400"
                  : darkMode
                    ? "text-gray-400 hover:text-white hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              💾 Saved Logs
            </button>
            <button
              onClick={() => setActiveTab("batch-analysis")}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "batch-analysis"
                  ? darkMode
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "bg-blue-500 text-white border-b-2 border-blue-400"
                  : darkMode
                    ? "text-gray-400 hover:text-white hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              📊 Analysis
            </button>
            <button
              onClick={() => setActiveTab("add-new")}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "add-new"
                  ? darkMode
                    ? "bg-blue-600 text-white border-b-2 border-blue-400"
                    : "bg-blue-500 text-white border-b-2 border-blue-400"
                  : darkMode
                    ? "text-gray-400 hover:text-white hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              ✍️ {isEditMode ? "Edit" : "New"}
            </button>
          </div>
        </div>

        {/* Tab Content for Embedded */}
        <div className="flex-1 overflow-y-auto p-4" style={{maxHeight: 'calc(100vh - 120px)'}}>
          {/* Saved Dive Logs Tab */}
          {activeTab === "saved-logs" && (
            <div className="space-y-4">
              {loadingDiveLogs ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <p
                    className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                  >
                    Loading dive logs...
                  </p>
                </div>
              ) : !logs.length ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🤿</div>
                  <p
                    className={`text-lg font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                  >
                    No dive logs yet
                  </p>
                  <p
                    className={`text-sm mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Add your first dive using the &quot;Create New Dive
                    Log&quot; tab!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header with stats and sort */}
                  <div className="flex justify-between items-center">
                    <div
                      className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                    >
                      <span className="font-medium">{logs.length}</span> dive
                      {logs.length !== 1 ? "s" : ""} logged
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={`text-xs px-2 py-1 rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="date">Sort by Date</option>
                      <option value="depth">Sort by Depth</option>
                      <option value="location">Sort by Location</option>
                    </select>
                  </div>

                  {/* Dive Logs List */}
                  <div className="space-y-3">
                    {sortedLogs.map((log, index) => (
                      <div
                        key={log.id || index}
                        className={`p-4 rounded-lg border ${
                          darkMode
                            ? "bg-gray-800 border-gray-700"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div
                              className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}
                            >
                              {new Date(log.date).toLocaleDateString()} -{" "}
                              {log.discipline || "Freediving"}
                            </div>
                            <div
                              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                            >
                              📍 {log.location || "Unknown location"}
                            </div>
                            <div
                              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                            >
                              🎯 Target: {log.targetDepth || log.target_depth || 0}m | Reached: {log.reachedDepth || log.reached_depth || 0}m
                            </div>
                            {/* DEBUG: show any extractedMetrics present on the log */}
                            {log.extractedMetrics && (
                              <div className={`text-xs mt-2 ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
                                <strong>Extracted:</strong> {safePreview(log.extractedMetrics, 120)}
                              </div>
                            )}
                            {log.notes && (
                              <div
                                className={`text-sm mt-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                              >
                                📝 {log.notes.slice(0, 100)}
                                {log.notes.length > 100 ? "..." : ""}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleAnalyzeDiveLog(log)}
                              disabled={analyzingLogId === log.id}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                analyzingLogId === log.id
                                  ? "bg-gray-400 cursor-not-allowed"
                                  : darkMode
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-blue-500 hover:bg-blue-600 text-white"
                              }`}
                            >
                              {analyzingLogId === log.id
                                ? "⏳ Analyzing..."
                                : "🤖 Analyze"}
                            </button>
                            <button
                              onClick={() => {
                                const mappedEntry = mapLogToFormEntry(log);
                                console.log("📝 Edit button - mapped entry:", mappedEntry);
                                setNewEntry(mappedEntry);
                                setIsEditMode(true);
                                setActiveTab("add-new");
                              }}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                darkMode
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "bg-green-500 hover:bg-green-600 text-white"
                              }`}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDiveLog(log)}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                darkMode
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "bg-red-500 hover:bg-red-600 text-white"
                              }`}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Batch Analysis Tab */}
          {activeTab === "batch-analysis" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  📊 Batch Analysis & Pattern Detection
                </h3>
                <button
                  onClick={handleExportLogs}
                  className={`text-sm px-3 py-1 rounded transition-colors ${
                    darkMode
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  📁 Export CSV
                </button>
              </div>

              {/* Analysis Controls */}
              <div className={`p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <h4 className={`font-medium mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Analysis Settings
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Analysis Type
                    </label>
                    <select
                      value={analysisType}
                      onChange={(e) => setAnalysisType(e.target.value)}
                      className={`w-full px-3 py-2 text-sm rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="pattern">🔍 Pattern Detection</option>
                      <option value="safety">🛡️ Safety Analysis</option>
                      <option value="performance">📈 Performance Review</option>
                      <option value="coaching">🎯 Coaching Insights</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Time Range
                    </label>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className={`w-full px-3 py-2 text-sm rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="week">📅 Last Week</option>
                      <option value="month">📅 Last Month</option>
                      <option value="quarter">📅 Last 3 Months</option>
                      <option value="year">📅 Last Year</option>
                      <option value="all">📅 All Time</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleBatchAnalysis}
                  disabled={isAnalyzing || logs.length === 0}
                  className={`mt-4 w-full px-4 py-2 rounded transition-colors ${
                    isAnalyzing || logs.length === 0
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : darkMode
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {isAnalyzing 
                    ? "🔄 Analyzing..." 
                    : logs.length === 0 
                      ? "❌ No Logs to Analyze" 
                      : `🚀 Analyze ${logs.length} Dive${logs.length !== 1 ? 's' : ''}`
                  }
                </button>
              </div>

              {/* Advanced Filters */}
              <div className={`p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <h4 className={`font-medium mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                  📋 Filter Logs
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Discipline
                    </label>
                    <select
                      value={filters.discipline}
                      onChange={(e) => setFilters(prev => ({...prev, discipline: e.target.value}))}
                      className={`w-full px-2 py-1 text-xs rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    >
                      <option value="">All Disciplines</option>
                      <option value="CWT">Constant Weight</option>
                      <option value="CNF">Constant No Fins</option>
                      <option value="FIM">Free Immersion</option>
                      <option value="STA">Static Apnea</option>
                      <option value="DNF">Dynamic No Fins</option>
                      <option value="DYN">Dynamic with Fins</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      Location
                    </label>
                    <input
                      type="text"
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({...prev, location: e.target.value}))}
                      placeholder="e.g. Blue Hole"
                      className={`w-full px-2 py-1 text-xs rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      From Date
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({...prev, dateFrom: e.target.value}))}
                      className={`w-full px-2 py-1 text-xs rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                      To Date
                    </label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({...prev, dateTo: e.target.value}))}
                      className={`w-full px-2 py-1 text-xs rounded border ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    Issues Filter
                  </label>
                  <select
                    value={filters.hasIssues}
                    onChange={(e) => setFilters(prev => ({...prev, hasIssues: e.target.value}))}
                    className={`w-full px-2 py-1 text-xs rounded border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="">All Dives</option>
                    <option value="true">❌ Only Dives with Issues</option>
                    <option value="false">✅ Only Clean Dives</option>
                  </select>
                </div>
              </div>

              {/* Current Analysis Result */}
              {batchAnalysis && (
                <div className={`p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <h4 className={`font-medium mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    🧠 Latest Analysis Results
                  </h4>
                  <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                    <div className="mb-2">
                      <span className="font-medium">Type:</span> {batchAnalysis.type} | 
                      <span className="font-medium"> Range:</span> {batchAnalysis.timeRange} | 
                      <span className="font-medium"> Logs:</span> {batchAnalysis.logsAnalyzed}
                    </div>
                    <div className={`p-3 rounded bg-gray-100 ${darkMode ? "bg-gray-700" : ""} whitespace-pre-wrap`}>
                      {batchAnalysis.result}
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis History */}
              {analysisHistory.length > 0 && (
                <div className={`p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <h4 className={`font-medium mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>
                    📚 Recent Analysis History
                  </h4>
                  <div className="space-y-2">
                    {analysisHistory.slice(0, 3).map((analysis, index) => {
                      const preview = safePreview(analysis?.result, 100);
                      return (
                        <div
                          key={index}
                          className={`p-2 rounded border cursor-pointer ${
                            darkMode ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                          }`}
                          onClick={() => setBatchAnalysis(analysis)}
                        >
                          <div className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            {analysis.type} • {analysis.timeRange} • {analysis.logsAnalyzed} logs • {new Date(analysis.createdAt).toLocaleDateString()}
                          </div>
                          <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-700"} truncate`}>
                            {preview}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add New / Edit Dive Log Tab */}
          {activeTab === "add-new" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3
                  className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                >
                  {isEditMode ? "✏️ Edit Dive Log" : "✍️ Create New Dive Log"}
                </h3>
                {isEditMode && (
                  <button
                    onClick={() => {
                      resetForm();
                      setActiveTab("saved-logs");
                    }}
                    className={`text-sm px-3 py-1 rounded ${
                      darkMode
                        ? "bg-gray-600 hover:bg-gray-700 text-gray-300"
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div
                  className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-blue-50 border border-blue-200"}`}
                >
                  <h4
                    className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    📅 Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Date
                      </label>
                      <input
                        name="date"
                        type="date"
                        value={newEntry.date}
                        onChange={handleInputChange}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                        required
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Type
                      </label>
                      <select
                        name="disciplineType"
                        value={newEntry.disciplineType}
                        onChange={handleInputChange}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      >
                        <option value="depth">Depth</option>
                        <option value="pool">Pool</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Discipline
                      </label>
                      <select
                        name="discipline"
                        value={newEntry.discipline}
                        onChange={handleInputChange}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      >
                        <option value="CWT">CWT (Constant Weight)</option>
                        <option value="CNF">CNF (Constant No Fins)</option>
                        <option value="FIM">FIM (Free Immersion)</option>
                        <option value="DNF">DNF (Dynamic No Fins)</option>
                        <option value="STA">STA (Static Apnea)</option>
                      </select>
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={newEntry.location}
                        onChange={handleInputChange}
                        placeholder="e.g., Blue Hole, Egypt"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Depth Section */}
                <div
                  className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-green-50 border border-green-200"}`}
                >
                  <h4
                    className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    📏 Depth Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Target Depth (m)
                      </label>
                      <input
                        type="number"
                        name="targetDepth"
                        value={newEntry.targetDepth}
                        onChange={handleInputChange}
                        placeholder="25"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Reached Depth (m)
                      </label>
                      <input
                        type="number"
                        name="reachedDepth"
                        value={newEntry.reachedDepth}
                        onChange={handleInputChange}
                        placeholder="23"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Mouthfill Depth (m)
                      </label>
                      <input
                        type="number"
                        name="mouthfillDepth"
                        value={newEntry.mouthfillDepth}
                        onChange={handleInputChange}
                        placeholder="15"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Issue Depth (m)
                      </label>
                      <input
                        type="number"
                        name="issueDepth"
                        value={newEntry.issueDepth}
                        onChange={handleInputChange}
                        placeholder="20"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Performance Section */}
                <div
                  className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-purple-50 border border-purple-200"}`}
                >
                  <h4
                    className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    ⏱️ Performance Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Duration/Distance
                      </label>
                      <input
                        type="text"
                        name="durationOrDistance"
                        value={newEntry.durationOrDistance}
                        onChange={handleInputChange}
                        placeholder="2:30 or 50m"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Total Dive Time
                      </label>
                      <input
                        type="text"
                        name="totalDiveTime"
                        value={newEntry.totalDiveTime}
                        onChange={handleInputChange}
                        placeholder="3:45"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Exit Condition
                      </label>
                      <input
                        type="text"
                        name="exit"
                        value={newEntry.exit}
                        onChange={handleInputChange}
                        placeholder="Clean, LMC, BO, etc."
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Attempt Type
                      </label>
                      <input
                        type="text"
                        name="attemptType"
                        value={newEntry.attemptType}
                        onChange={handleInputChange}
                        placeholder="Training, PB attempt, etc."
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Issues & Notes Section */}
                <div
                  className={`p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-orange-50 border border-orange-200"}`}
                >
                  <h4
                    className={`text-sm font-semibold mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                  >
                    ⚠️ Issues & Notes
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Issue Comment
                      </label>
                      <textarea
                        name="issueComment"
                        value={newEntry.issueComment}
                        onChange={handleInputChange}
                        placeholder="Describe any issues encountered..."
                        rows={2}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>

                    <div>
                      <label
                        className={`flex items-center text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        <input
                          type="checkbox"
                          name="squeeze"
                          checked={newEntry.squeeze}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Squeeze experienced
                      </label>
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Surface Protocol
                      </label>
                      <select
                        name="surfaceProtocol"
                        value={newEntry.surfaceProtocol}
                        onChange={handleInputChange}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      >
                        <option value="">Not specified</option>
                        <option value="ok">OK - Clean surface</option>
                        <option value="samba">Samba (minor)</option>
                        <option value="lmc">LMC (Loss of Motor Control)</option>
                        <option value="bo">BO (Blackout)</option>
                      </select>
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Upload Dive Image
                      </label>
                      
                      {/* Show existing image when editing */}
                      {newEntry.imagePreview && !newEntry.imageFile && (
                        <div className="mb-2 p-2 bg-green-900/20 border border-green-600 rounded">
                          <p className="text-sm text-green-400 mb-2">✅ Saved dive image found:</p>
                          <Image
                            src={newEntry.imagePreview}
                            alt="Saved dive computer image"
                            width={128}
                            height={128}
                            className="max-w-full h-32 object-cover rounded mb-2"
                          />
                          <p className="text-xs text-gray-400">Upload a new image to replace this one</p>
                        </div>
                      )}
                      
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      />
                      
                      {/* Show new image preview when user selects a file */}
                      {newEntry.imagePreview && newEntry.imageFile && (
                        <div className="mt-2">
                          <p className="text-sm text-blue-400 mb-1">New image preview:</p>
                          <Image
                            src={newEntry.imagePreview}
                            alt="New image preview"
                            width={128}
                            height={128}
                            className="max-w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={newEntry.notes}
                        onChange={handleInputChange}
                        placeholder="How did the dive go? Any observations..."
                        rows={3}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded font-semibold transition-colors"
                >
                  {isSaving ? "⏳ Saving..." : "💾 "}{isEditMode ? "Update Dive Entry" : "Save Dive Entry"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Non-embedded rendering can be implemented as needed; currently handled by parent via isOpen
  return null;
}
