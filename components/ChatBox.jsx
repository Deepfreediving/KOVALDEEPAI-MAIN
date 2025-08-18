import React, { useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

const ADMIN_USER_ID = "admin-daniel-koval";

export default function ChatBox({
  userId,
  profile = {},
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

  // ✅ Admin-only authentication
  const isAuthenticated = userId === ADMIN_USER_ID;

  useEffect(() => {
    console.log("💬 ChatBox authentication status:", isAuthenticated ? "ADMIN AUTHENTICATED" : "UNAUTHORIZED");
    console.log("💬 ChatBox userId:", userId);
  }, [isAuthenticated, userId]);

  // ✅ Show admin-only access banner if not authenticated
  if (!isAuthenticated) {
    return (
      <main
        className={`min-h-screen flex items-center justify-center px-4 ${
          darkMode ? "bg-black text-white" : "bg-white text-gray-900"
        }`}
      >
        <div
          className={`w-full max-w-3xl p-8 rounded-xl shadow-lg border text-center ${
            darkMode ? "border-gray-700 bg-[#121212]" : "border-gray-300 bg-white"
          }`}
        >
          <div className="mb-6">
            <img
              src="/deeplogo.jpg"
              alt="Logo"
              className="w-16 h-16 rounded-full mx-auto mb-4"
            />
            <h1 className="text-2xl font-semibold mb-2">Admin Access Required</h1>
            <p className="text-gray-600 dark:text-gray-400">
              🔒 This AI system is currently admin-only access.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Only authorized administrators can access the Koval AI chat system.
            </p>
            <p className="text-xs text-gray-400">
              Contact: daniel.koval@example.com
            </p>
          </div>
        </div>
      </main>
    );
  }

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

  // ✅ Unified Send Function - Supabase only
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
          formData.append("userId", userId);
          formData.append("diveLogId", `dive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

          const res = await fetch("/api/openai/upload-dive-image-simple", {
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
              content: data.answer || data.response || "✅ Image uploaded successfully.",
            },
          ]);

          onUploadSuccess?.("✅ Dive image uploaded and analyzed.");
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

        // ✅ Use Supabase chat API for admin user
        const res = await fetch("/api/supabase/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmedInput,
            userId: userId,
            profile: profile,
          }),
        });

        if (!res.ok) {
          console.warn(`⚠️ Supabase chat failed (${res.status}), trying OpenAI direct...`);

          // Fallback to direct OpenAI chat API
          const fallbackRes = await fetch("/api/openai/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: trimmedInput,
              userId: userId,
              profile: profile,
            }),
          });

          if (!fallbackRes.ok) {
            throw new Error(
              `Both chat APIs failed: Supabase ${res.status}, OpenAI ${fallbackRes.status}`,
            );
          }

          const fallbackData = await fallbackRes.json();
          console.log("✅ OpenAI fallback response received:", fallbackData);

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: fallbackData.response || fallbackData.answer || "I received your message!",
            },
          ]);
          return;
        }

        const chatData = await res.json();
        console.log("✅ Supabase chat response received:", chatData);

        // Handle Supabase chat API response
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: chatData.response || chatData.answer || "I received your message!",
          },
        ]);
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
              <h1 className="text-xl font-semibold">Koval AI Admin Chat</h1>
              <p className="text-xs text-green-500 dark:text-green-400">
                ✅ Admin Access - {profile?.nickname || "Daniel Koval"}
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
