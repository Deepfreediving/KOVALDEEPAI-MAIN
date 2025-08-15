import React, { useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import { getOrCreateUserId } from "@/utils/userIdUtils";

export default function ChatBox({
  userId = "Guest",
  profile = {},
  eqState = {},
  setEqState,
  darkMode,
  onUploadSuccess,
  messages,
  setMessages,
  input,
  setInput,
  files,
  setFiles,
  loading,
  setLoading,
}) {
  const BOT_NAME = "Koval AI";
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // ✅ IMPROVED USER ID MANAGEMENT
  const effectiveUserId = getOrCreateUserId(userId);

  useEffect(() => {
    console.log("💬 ChatBox using effective user ID:", effectiveUserId);
  }, [effectiveUserId]);

  // ✅ Smooth Auto-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // ✅ File Change
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > 3) {
      alert("⚠️ You can only upload up to 3 images.");
      return;
    }
    setFiles(selected);
  };

  // ✅ Unified Send Function
  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;

    setLoading(true);

    try {
      // -------- IMAGE UPLOAD --------
      if (files.length > 0) {
        for (const file of files) {
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          });

          const formData = new FormData();
          formData.append("image", compressed);

          const res = await fetch("/api/openai/upload-dive-image", {
            method: "POST",
            body: formData,
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok)
            throw new Error(data?.error || `Upload failed (${res.status})`);

          setMessages((prev) => [
            ...prev,
            { role: "user", content: `📤 Uploaded: ${file.name}` },
            {
              role: "assistant",
              content: data.answer || "✅ Image uploaded successfully.",
            },
          ]);

          onUploadSuccess?.("✅ Dive profile uploaded.");
        }
        setFiles([]);
      }

      // -------- CHAT MESSAGE --------
      if (trimmedInput) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: trimmedInput },
        ]);
        setInput("");

        // ✅ Use enhanced Wix bridge API for better integration
        const res = await fetch("/api/wix/chat-bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: trimmedInput,
            profile,
            eqState,
            userId: effectiveUserId,
            embedMode: false, // This is for direct usage, not embedded
          }),
        });

        if (!res.ok) {
          console.warn(
            `⚠️ Chat bridge failed (${res.status}), trying fallback...`,
          );

          // Fallback to direct OpenAI chat API
          const fallbackRes = await fetch("/api/openai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: trimmedInput,
              profile,
              eqState,
              userId: effectiveUserId,
            }),
          });

          if (!fallbackRes.ok) {
            throw new Error(
              `Both chat APIs failed: Bridge ${res.status}, Fallback ${fallbackRes.status}`,
            );
          }

          const fallbackData = await fallbackRes.json();
          console.log("✅ Fallback chat response received:", fallbackData);

          if (fallbackData.assistantMessage) {
            setMessages((prev) => [...prev, fallbackData.assistantMessage]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  fallbackData.answer ||
                  fallbackData.aiResponse ||
                  "I received your message!",
              },
            ]);
          }
          return;
        }

        const bridgeData = await res.json();
        console.log("✅ Chat bridge response received:", bridgeData);

        // Handle bridge API response format
        if (bridgeData.aiResponse || bridgeData.assistantMessage?.content) {
          const assistantMessage = {
            role: "assistant",
            content:
              bridgeData.aiResponse ||
              bridgeData.assistantMessage?.content ||
              "I received your message!",
          };

          // Add metadata if available
          if (bridgeData.metadata) {
            assistantMessage.metadata = bridgeData.metadata;
            console.log(
              `📊 Chat metadata: ${bridgeData.metadata.processingTime}ms, source: ${bridgeData.source}`,
            );
          }

          setMessages((prev) => [...prev, assistantMessage]);
        } else if (bridgeData.type === "eq-followup") {
          setEqState?.((prev) => ({
            ...prev,
            answers: { ...prev.answers, [bridgeData.key]: trimmedInput },
          }));
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `🔍 ${bridgeData.question}` },
          ]);
        } else if (bridgeData.type === "eq-diagnosis") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🧠 Diagnosis: ${bridgeData.label}\n\nRecommended Drills:\n${bridgeData.drills.join(
                "\n",
              )}`,
            },
          ]);
          setEqState?.({});
        } else if (bridgeData.assistantMessage) {
          setMessages((prev) => [...prev, bridgeData.assistantMessage]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: bridgeData.answer || "⚠️ Unrecognized response format.",
            },
          ]);
        }
      }
    } catch (err) {
      console.error("❌ Chat/Upload error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Unable to respond: ${err.message}`,
        },
      ]);
    }

    setLoading(false);
  };

  // ✅ Send on Enter
  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === "Return") && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <main
      className={`min-h-screen flex items-center justify-center px-4 ${
        darkMode ? "bg-black text-white" : "bg-white text-gray-900"
      }`}
    >
      <div
        className={`w-full max-w-3xl h-screen flex flex-col rounded-xl shadow-lg border ${
          darkMode ? "border-gray-700 bg-[#121212]" : "border-gray-300 bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode
              ? "border-gray-700 bg-[#1a1a1a]"
              : "border-gray-200 bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <img
              src="/deeplogo.jpg"
              alt="Logo"
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h1 className="text-xl font-semibold">koval-ai Deep Chat</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {profile?.nickname || effectiveUserId}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={containerRef} className="flex-1 overflow-y-auto">
          <ChatMessages
            messages={messages}
            BOT_NAME={BOT_NAME}
            darkMode={darkMode}
            loading={loading}
            bottomRef={bottomRef}
          />
        </div>

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          handleKeyDown={handleKeyDown}
          handleFileChange={handleFileChange}
          files={files}
          setFiles={setFiles}
          loading={loading}
          darkMode={darkMode}
        />
      </div>
    </main>
  );
}
