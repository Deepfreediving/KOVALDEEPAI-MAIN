import { useEffect, useState } from "react";
import Image from "next/image";
import { ADMIN_USER_ID } from "@/utils/adminAuth";

export default function DiveJournalDisplay({
  darkMode,
  isOpen,
  onClose,
  isEmbedded = false,
  setMessages,
  refreshKey,
  onDiveLogSaved, // 🚀 NEW: Callback when dive log is saved
  onDiveLogDeleted, // 🚀 NEW: Callback when dive log is deleted
  onRefreshDiveLogs, // 🚀 NEW: Callback to refresh dive logs in parent
  editingLog = null, // 🚀 NEW: Log to edit (pre-fills form)
  // onEditDiveLog is available but not currently used in this component
}) {
  const [logs, setLogs] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [activeTab, setActiveTab] = useState("saved-logs"); // Tab navigation: saved-logs, add-new
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    disciplineType: "depth",
    discipline: "",
    location: "",
    targetDepth: "",
    reachedDepth: "",
    mouthfillDepth: "",
    issueDepth: "",
    issueComment: "",
    squeeze: false,
    exit: "",
    durationOrDistance: "",
    totalDiveTime: "",
    attemptType: "",
    surfaceProtocol: "",
    notes: "",
    imageFile: null,
    imagePreview: null,
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [analyzingLogId, setAnalyzingLogId] = useState(null); // Track which log is being analyzed
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're editing

  // ✅ Handle editing mode - pre-fill form when editingLog is provided
  useEffect(() => {
    if (editingLog) {
      console.log(
        "📝 DiveJournalDisplay: Entering edit mode for log:",
        editingLog.id,
      );
      setNewEntry({
        ...editingLog,
        imageFile: null, // Reset file input
        imagePreview: editingLog.imageUrl || null, // Use existing image URL if available
      });
      setIsEditMode(true);
      setActiveTab("add-new"); // Switch to form tab
    } else {
      setIsEditMode(false);
    }
  }, [editingLog]);

  useEffect(() => {
    console.log("🔄 DiveJournalDisplay: Refreshing logs from localStorage...", {
      adminUserId: ADMIN_USER_ID,
      refreshKey,
    });
    try {
      const stored = localStorage.getItem(`diveLogs_${ADMIN_USER_ID}`); // ✅ Updated: Use ADMIN_USER_ID
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        setLogs(parsedLogs);
        console.log(
          `✅ DiveJournalDisplay: Loaded ${parsedLogs.length} logs from localStorage`,
        );
      } else {
        setLogs([]);
        console.log("📭 DiveJournalDisplay: No stored logs found");
      }
    } catch (error) {
      console.error("❌ DiveJournalDisplay: Failed to load logs:", error);
      setLogs([]);
    }
  }, [refreshKey]);

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

  const handleImageChange = (e) => {
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
    } else {
      console.log("❌ No file selected");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🚀 DiveJournalDisplay: Starting dive log submit process...");

    const toNum = (v) => v === '' || v == null ? null : Number(v);

    const newLog = {
      ...newEntry,
      id: isEditMode ? editingLog.id : Date.now().toString(),
      timestamp: new Date().toISOString(),
      nickname: ADMIN_USER_ID, // ✅ Updated: Use ADMIN_USER_ID
      imageFile: newEntry.imageFile, // ✅ Preserve image file for processing
      imagePreview: newEntry.imagePreview, // ✅ Preserve image preview
      // Convert form data to database schema
      target_depth: toNum(newEntry.targetDepth),
      reached_depth: toNum(newEntry.reachedDepth),
      mouthfill_depth: toNum(newEntry.mouthfillDepth),
      issue_depth: toNum(newEntry.issueDepth),
      issue_comment: newEntry.issueComment || null,
      exit_status: newEntry.exit || null,
      duration_seconds: newEntry.disciplineType === 'pool' ? toNum(newEntry.durationOrDistance) : null,
      distance_m: newEntry.disciplineType === 'pool' ? null : toNum(newEntry.durationOrDistance),
      total_time_seconds: toNum(newEntry.totalDiveTime),
      attempt_type: newEntry.attemptType || null,
      surface_protocol: newEntry.surfaceProtocol || null,
      bottom_time_seconds: toNum(newEntry.bottomTime),
      ear_squeeze: newEntry.earSqueeze || null,
      lung_squeeze: newEntry.lungSqueeze || null,
      narcosis_level: toNum(newEntry.narcosisLevel),
      recovery_quality: toNum(newEntry.recoveryQuality),
      gear: newEntry.gear || {}
    };

    console.log("📝 DiveJournalDisplay: Prepared dive log data:", {
      id: newLog.id,
      nickname: newLog.nickname,
      location: newLog.location,
      depth: newLog.reachedDepth || newLog.targetDepth,
      date: newLog.date,
      isEditMode,
      hasImage: !!newEntry.imageFile,
    });

    try {
      // 🚀 STEP 1: Handle image upload if present
      let imageAnalysis = null;
      if (newEntry.imageFile && !isEditMode) {
        console.log("📸 DiveJournalDisplay: Uploading and analyzing image...");
        
        // Show immediate feedback
        if (setMessages) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "📸 Analyzing your dive profile image...",
            },
          ]);
        }
        
        try {
          const formData = new FormData();
          formData.append('image', newEntry.imageFile);
          formData.append('diveLogId', newLog.id);
          
          console.log("📤 Uploading image file:", {
            name: newEntry.imageFile.name,
            size: newEntry.imageFile.size,
            type: newEntry.imageFile.type,
            diveLogId: newLog.id,
          });
          
          // Log FormData contents for debugging
          for (let [key, value] of formData.entries()) {
            console.log(`📝 FormData ${key}:`, value instanceof File ? `File(${value.name}, ${value.size}bytes)` : value);
          }
          
          const imageResponse = await fetch('/api/openai/upload-dive-image-simple', {
            method: 'POST',
            body: formData,
          });
          
          console.log("📡 Image upload response status:", imageResponse.status);
          console.log("📡 Image upload response headers:", Object.fromEntries(imageResponse.headers.entries()));
          
          const responseText = await imageResponse.text();
          console.log("📥 Image upload response body:", responseText);
          
          if (imageResponse.ok) {
            const imageResult = JSON.parse(responseText);
            console.log("✅ DiveJournalDisplay: Image analyzed successfully:", imageResult);
            imageAnalysis = imageResult.data;
            newLog.imageUrl = imageResult.data?.imageUrl;
            newLog.imageAnalysis = imageAnalysis;
            newLog.extractedText = imageResult.data?.extractedText;
            
            // Show image analysis in chat
            if (setMessages && imageAnalysis) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `📸 **Image Analysis Complete**\n\n${imageResult.message || 'Dive profile image has been analyzed and will be included in your coaching feedback.'}\n\n${imageResult.data?.extractedText ? `**Detected Text:** ${imageResult.data.extractedText}` : ''}`,
                },
              ]);
            }
          } else {
            console.warn("⚠️ DiveJournalDisplay: Image upload failed:", imageResponse.status, responseText);
            if (setMessages) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: "⚠️ Image analysis failed, but your dive log will still be saved without the image.",
                },
              ]);
            }
          }
        } catch (imageError) {
          console.error("❌ DiveJournalDisplay: Image processing error:", imageError);
          if (setMessages) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "❌ Image processing error occurred. Your dive log will be saved without the image.",
              },
            ]);
          }
        }
      }

      // 🚀 STEP 2: Save to Supabase via API
      console.log("🌐 DiveJournalDisplay: Saving to Supabase via API...");
      const response = await fetch("/api/supabase/save-dive-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newLog),
      });

      console.log(
        "📥 DiveJournalDisplay: Save API response status:",
        response.status,
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ DiveJournalDisplay: Save successful:", result);

        // 🚀 STEP 2: Update local state with proper deduplication
        let updatedLogs;
        if (isEditMode) {
          updatedLogs = logs.map((log) =>
            log.id === newLog.id ? newLog : log,
          );
          console.log(
            "✅ DiveJournalDisplay: Updated existing log in local state",
          );
        } else {
          // Check for duplicates before adding
          const existingLog = logs.find(
            (log) =>
              log.id === newLog.id ||
              (log.date === newLog.date &&
                log.reachedDepth === newLog.reachedDepth &&
                log.location === newLog.location),
          );

          if (existingLog) {
            console.log(
              "⚠️ DiveJournalDisplay: Duplicate log detected, updating instead of adding",
            );
            updatedLogs = logs.map((log) =>
              log.id === newLog.id ||
              (log.date === newLog.date &&
                log.reachedDepth === newLog.reachedDepth &&
                log.location === newLog.location)
                ? newLog
                : log,
            );
          } else {
            updatedLogs = [...logs, newLog];
            console.log("✅ DiveJournalDisplay: Added new log to local state");
          }
        }
        setLogs(updatedLogs);

        // 🚀 STEP 3: Update localStorage IMMEDIATELY with deduplication
        try {
          const storageKey = `diveLogs_${ADMIN_USER_ID}`; // ✅ Updated: Use nickname instead of userId
          console.log(
            "💾 DiveJournalDisplay: Updating localStorage with key:",
            storageKey,
          );

          // Get existing logs from localStorage (not just component state)
          const existingLogs = JSON.parse(
            localStorage.getItem(storageKey) || "[]",
          );
          console.log(
            "📋 DiveJournalDisplay: Found",
            existingLogs.length,
            "existing logs in localStorage",
          );

          // Deduplicate logs in localStorage too
          const filteredExisting = existingLogs.filter(
            (log) =>
              log.id !== newLog.id &&
              !(
                log.date === newLog.date &&
                log.reachedDepth === newLog.reachedDepth &&
                log.location === newLog.location
              ),
          );

          // Add new log and sort by date
          const finalLogs = [...filteredExisting, newLog].sort(
            (a, b) => new Date(b.date) - new Date(a.date),
          );

          // Save to localStorage
          localStorage.setItem(storageKey, JSON.stringify(finalLogs));
          console.log(
            "✅ DiveJournalDisplay: localStorage updated successfully",
          );
          console.log("   • Storage key:", storageKey);
          console.log("   • Total logs stored:", finalLogs.length);
          console.log("   • New log ID:", newLog.id);

          // 🔍 VERIFICATION: Check if data was actually saved
          const verifyStorage = localStorage.getItem(storageKey);
          if (verifyStorage) {
            const verifyLogs = JSON.parse(verifyStorage);
            console.log(
              "✅ DiveJournalDisplay: localStorage verification passed -",
              verifyLogs.length,
              "logs found",
            );
            
            // 🚀 FORCE REFRESH: Update component state with verified data
            setLogs(verifyLogs);
            console.log("🔄 DiveJournalDisplay: Component state synchronized with localStorage");
          } else {
            console.error(
              "❌ DiveJournalDisplay: localStorage verification failed - no data found",
            );
          }
        } catch (storageError) {
          console.error(
            "❌ DiveJournalDisplay: Failed to update localStorage:",
            storageError,
          );
          console.log("   • Storage key attempted:", `diveLogs_${ADMIN_USER_ID}`); // ✅ Fixed: Use nickname
          console.log("   • admin user ID:", ADMIN_USER_ID);
          console.log(
            "   • Browser storage available:",
            typeof localStorage !== "undefined",
          );
        }

        // 🚀 STEP 4: Notify parent components
        if (onDiveLogSaved) {
          console.log(
            "📢 DiveJournalDisplay: Notifying parent of successful save...",
          );
          onDiveLogSaved(newLog, result);
        }

        if (onRefreshDiveLogs) {
          console.log(
            "🔄 DiveJournalDisplay: Triggering parent dive logs refresh...",
          );
          onRefreshDiveLogs();
        }

        // 🚀 ADDITIONAL: Force sidebar refresh by dispatching storage event
        try {
          window.dispatchEvent(new StorageEvent('storage', {
            key: `diveLogs_${ADMIN_USER_ID}`, // ✅ FIXED: Use nickname consistently
            newValue: localStorage.getItem(`diveLogs_${ADMIN_USER_ID}`), // ✅ FIXED: Use nickname consistently
            storageArea: localStorage
          }));
          console.log("📡 DiveJournalDisplay: Dispatched storage event for sidebar refresh");
        } catch (eventError) {
          console.warn("⚠️ DiveJournalDisplay: Could not dispatch storage event:", eventError);
        }

        // 🚀 STEP 5: Show success message in chat
        if (setMessages) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `✅ **Dive Log ${isEditMode ? "Updated" : "Saved"}** \n\n${newLog.discipline || "Freediving"} dive to ${newLog.reachedDepth || newLog.targetDepth}m at ${newLog.location || "location"} has been ${isEditMode ? "updated" : "saved"} successfully.`,
            },
          ]);
        }

        // 🚀 STEP 6: Automatically trigger AI analysis for new logs
        if (!isEditMode && setMessages) {
          console.log("🤖 DiveJournalDisplay: Triggering automatic AI analysis...");
          setTimeout(async () => {
            try {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `🔄 **Analyzing Your Dive**\n\nI'm now analyzing your ${newLog.discipline || "freediving"} dive to ${newLog.reachedDepth || newLog.targetDepth}m for coaching feedback...`,
                },
              ]);

              const analysisResponse = await fetch("/api/analyze/dive-log-openai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  adminUserId: ADMIN_USER_ID,
                  nickname: ADMIN_USER_ID, // backward compatibility
                  diveLogData: newLog,
                }),
              });

              if (analysisResponse.ok) {
                const analysisResult = await analysisResponse.json();
                if (analysisResult.success && analysisResult.analysis) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      role: "assistant",
                      content: `📊 **Dive Analysis Complete**\n\n${analysisResult.analysis}`,
                    },
                  ]);
                  console.log("✅ DiveJournalDisplay: Auto-analysis completed");
                } else {
                  console.warn("⚠️ DiveJournalDisplay: Analysis failed:", analysisResult);
                }
              }
            } catch (autoAnalysisError) {
              console.error("❌ DiveJournalDisplay: Auto-analysis error:", autoAnalysisError);
            }
          }, 1500); // Small delay to let save message show first
        }

        // Reset form and close popup after successful save
        resetForm();

        // 🚀 Close popup journal after save
        if (onClose && !isEmbedded) {
          console.log(
            "🔒 DiveJournalDisplay: Closing popup journal after successful save",
          );
          onClose();
        }

        // 🚀 Switch back to saved logs tab if embedded
        if (isEmbedded) {
          setActiveTab("saved-logs");
        }

        console.log(
          "✅ DiveJournalDisplay: Dive log submit process completed successfully",
        );
      } else {
        throw new Error(
          `API save failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error(
        "❌ DiveJournalDisplay: Failed to save dive log via API:",
        error,
      );

      // Show error message in chat
      if (setMessages) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ **Save Failed** \n\nFailed to ${isEditMode ? "update" : "save"} dive log: ${error.message}. Please try again.`,
          },
        ]);
      }
    }
  };

  const resetForm = () => {
    setNewEntry({
      date: new Date().toISOString().split("T")[0],
      disciplineType: "depth",
      discipline: "",
      location: "",
      targetDepth: "",
      reachedDepth: "",
      mouthfillDepth: "",
      issueDepth: "",
      issueComment: "",
      squeeze: false,
      exit: "",
      durationOrDistance: "",
      totalDiveTime: "",
      attemptType: "",
      surfaceProtocol: "",
      notes: "",
      imageFile: null,
      imagePreview: null,
    });
    setIsEditMode(false);
  };

  // ✅ Reworked analyze handler - fire-and-forget pattern
  const handleAnalyzeDiveLog = async (log) => {
    if (!log || !ADMIN_USER_ID) {
      console.warn("⚠️ Missing log or ADMIN_USER_ID for analysis", { log, ADMIN_USER_ID });
      if (setMessages) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "❌ Can't analyze: missing user context." }
        ]);
      }
      return;
    }

    // show immediate feedback in chat
    if (setMessages) {
      const depth = log.reachedDepth ?? log.targetDepth ?? "—";
      const disc  = log.discipline || "freediving";
      const loc   = log.location || "your location";
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `🔄 Analyzing your ${disc} dive to ${depth}m at ${loc}...` }
      ]);
    }

    setAnalyzingLogId?.(log.id);

    // 👉 Close the journal ASAP so the user can keep using chat
    if (onClose && !isEmbedded) {
      // microtask to avoid interfering with current React event
      Promise.resolve().then(() => onClose());
    }

    // Fire the request (do not block UI). We still handle the response to post results.
    const payload = {
      adminUserId: ADMIN_USER_ID,   // ✅ new field your API should use
      nickname: ADMIN_USER_ID,      // ↙ keep for backward-compat if your API still reads `nickname`
      diveLogId: log.id,
      diveLogData: log,
    };

    try {
      const resp = await fetch("/api/analyze/dive-log-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Analyze API failed ${resp.status}: ${txt}`);
      }

      const result = await resp.json();

      if (result?.success && result?.analysis) {
        // Update logs safely (avoid stale closure)
        setLogs?.((prev = []) => {
          const updated = prev.map(l => (l.id === log.id ? { ...l, analysis: result.analysis, analyzed: true } : l));
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(`diveLogs_${ADMIN_USER_ID}`, JSON.stringify(updated));
            }
          } catch (storageError) {
            console.warn("⚠️ Failed to update localStorage:", storageError);
          }
          return updated;
        });

        // Post analysis to chat
        if (setMessages) {
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: `📊 **Dive Analysis Complete**\n\n${result.analysis}` }
          ]);
        }
      } else {
        const errMsg = result?.error || "Unknown analysis error";
        if (setMessages) {
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: `❌ Analysis failed: ${errMsg}` }
          ]);
        }
      }
    } catch (err) {
      console.error("❌ Analysis error:", err);
      if (setMessages) {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: `❌ Failed to analyze dive log: ${err.message}` }
        ]);
      }
    } finally {
      setAnalyzingLogId?.(null);
    }
  };

  // 🚀 Add delete functionality with API integration
  const handleDeleteDiveLog = async (logToDelete) => {
    if (!logToDelete || !logToDelete.id) {
      console.warn("⚠️ DiveJournalDisplay: No log to delete");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete the dive log from ${logToDelete.date} at ${logToDelete.location || "unknown location"}?`,
      )
    ) {
      return;
    }

    console.log(
      "🗑️ DiveJournalDisplay: Starting delete process for log:",
      logToDelete.id,
    );

    try {
      // 🚀 STEP 1: Delete from Supabase API
      console.log("🌐 DiveJournalDisplay: Deleting from Supabase via API...");
      const response = await fetch("/api/supabase/delete-dive-log", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminUserId: ADMIN_USER_ID,
          nickname: ADMIN_USER_ID, // backward compatibility
          logId: logToDelete.id,
          source: "dive-journal-display",
        }),
      });

      console.log(
        "📥 DiveJournalDisplay: Delete API response status:",
        response.status,
      );

      if (response.ok) {
        const result = await response.json();
        console.log("✅ DiveJournalDisplay: Delete successful:", result);

        // 🚀 STEP 2: Update local state
        const updatedLogs = logs.filter((log) => log.id !== logToDelete.id);
        setLogs(updatedLogs);

        // 🚀 STEP 3: Update localStorage
        try {
          localStorage.setItem(
            `diveLogs_${ADMIN_USER_ID}`, // ✅ Fixed: Use ADMIN_USER_ID
            JSON.stringify(updatedLogs),
          );
          console.log(
            "💾 DiveJournalDisplay: Updated localStorage after delete",
          );
        } catch (error) {
          console.warn(
            "⚠️ DiveJournalDisplay: Failed to update localStorage:",
            error,
          );
        }

        // 🚀 STEP 4: Notify parent components
        if (onDiveLogDeleted) {
          console.log(
            "📢 DiveJournalDisplay: Notifying parent of successful delete...",
          );
          onDiveLogDeleted(logToDelete, result);
        }

        if (onRefreshDiveLogs) {
          console.log(
            "🔄 DiveJournalDisplay: Triggering parent dive logs refresh...",
          );
          onRefreshDiveLogs();
        }

        // 🚀 STEP 5: Show success message in chat
        if (setMessages) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🗑️ **Dive Log Deleted** \n\nThe dive log from ${logToDelete.date} at ${logToDelete.location || "unknown location"} has been removed.`,
            },
          ]);
        }

        console.log(
          "✅ DiveJournalDisplay: Delete process completed successfully",
        );
      } else {
        throw new Error(
          `API delete failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error(
        "❌ DiveJournalDisplay: Failed to delete dive log via API:",
        error,
      );

      // Show error message in chat
      if (setMessages) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ **Delete Failed** \n\nFailed to delete dive log: ${error.message}. Please try again.`,
          },
        ]);
      }
    }
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
              💾 Saved Dive Logs
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
              ✍️ {isEditMode ? "Edit Dive Log" : "Create New Dive Log"}
            </button>
          </div>
        </div>

        {/* Tab Content for Embedded */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Saved Dive Logs Tab */}
          {activeTab === "saved-logs" && (
            <div className="space-y-4">
              {!logs.length ? (
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
                              🎯 Target: {log.targetDepth || 0}m | Reached:{" "}
                              {log.reachedDepth || 0}m
                            </div>
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
                                // Set editing mode and switch to form tab
                                setNewEntry({
                                  ...log,
                                  imageFile: null,
                                  imagePreview: log.imageUrl || null,
                                });
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
                      <input
                        type="text"
                        name="discipline"
                        value={newEntry.discipline}
                        onChange={handleInputChange}
                        placeholder="e.g., CWT, CNF, FIM"
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
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
                      <input
                        type="text"
                        name="surfaceProtocol"
                        value={newEntry.surfaceProtocol}
                        onChange={handleInputChange}
                        placeholder="OK sign, breathing pattern, etc."
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Upload Dive Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      />
                      {newEntry.imagePreview && (
                        <Image
                          src={newEntry.imagePreview}
                          alt="Preview"
                          width={128}
                          height={128}
                          className="mt-2 max-w-full h-32 object-cover rounded"
                        />
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
                  💾 {isEditMode ? "Update Dive Entry" : "Save Dive Entry"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Rest of the component for non-embedded (popup) mode would go here...
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"} rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">🤿 Dive Journal</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Same content as embedded version */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Tab Navigation for Popup */}
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
                  💾 Saved Dive Logs
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
                  ✍️ {isEditMode ? "Edit Dive Log" : "Create New Dive Log"}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Saved Dive Logs Tab Content - Same as embedded */}
              {activeTab === "saved-logs" && (
                <div className="space-y-4">
                  {!logs.length ? (
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
                        Add your first dive using the &quot;Create New Dive Log&quot; tab!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Header with stats and sort */}
                      <div className="flex justify-between items-center">
                        <div
                          className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                        >
                          <span className="font-medium">{logs.length}</span>{" "}
                          dive{logs.length !== 1 ? "s" : ""} logged
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
                                ? "bg-gray-700 border-gray-600"
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
                                  🎯 Target: {log.targetDepth || 0}m | Reached:{" "}
                                  {log.reachedDepth || 0}m
                                </div>
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
                                    // Set editing mode and switch to form tab
                                    setNewEntry({
                                      ...log,
                                      imageFile: null,
                                      imagePreview: log.imageUrl || null,
                                    });
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

              {/* Add New / Edit Dive Log Tab Content - Same as embedded */}
              {activeTab === "add-new" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3
                      className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {isEditMode
                        ? "✏️ Edit Dive Log"
                        : "✍️ Create New Dive Log"}
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
                      className={`p-4 rounded-lg ${darkMode ? "bg-gray-700 border border-gray-600" : "bg-blue-50 border border-blue-200"}`}
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
                            className={`w-full p-2 rounded border ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"}`}
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
                            className={`w-full p-2 rounded border ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"}`}
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
                          <input
                            type="text"
                            name="discipline"
                            value={newEntry.discipline}
                            onChange={handleInputChange}
                            placeholder="e.g., CWT, CNF, FIM"
                            className={`w-full p-2 rounded border ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"}`}
                          />
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
                            className={`w-full p-2 rounded border ${darkMode ? "bg-gray-600 text-white border-gray-500" : "bg-white text-gray-900 border-gray-300"}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* All other form sections go here - same as embedded version */}
                    {/* ... (continuing with all form sections) */}

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded font-semibold transition-colors"
                    >
                      💾 {isEditMode ? "Update Dive Entry" : "Save Dive Entry"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
