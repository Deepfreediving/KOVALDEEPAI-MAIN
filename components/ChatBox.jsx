import React, { useState, useEffect, useRef } from "react";
import imageCompression from "browser-image-compression";

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
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3);
    setFiles(selected);
    setUploadMessage("");
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;

    setLoading(true);

    // Upload and analyze images
    if (files.length > 0) {
      try {
        for (const file of files) {
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
          });

          const formData = new FormData();
          formData.append("image", compressed);

          const res = await fetch("/api/upload-dive-image", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (res.ok) {
            const aiResponse = data.answer || "✅ Image uploaded.";
            setMessages((prev) => [
              ...prev,
              { role: "user", content: `📤 Uploaded: ${file.name}` },
              { role: "assistant", content: aiResponse },
            ]);
            onUploadSuccess?.("✅ Dive profile uploaded.");
          } else {
            throw new Error(data.error || "Image upload failed");
          }
        }

        setUploadMessage("✅ Image(s) uploaded and analyzed.");
      } catch (err) {
        console.error("❌ Upload error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Failed to process image. Try again." },
        ]);
        setUploadMessage("❌ Upload error.");
      } finally {
        setFiles([]);
      }
    }

    // Send chat message
    if (trimmedInput) {
      const userMessage = { role: "user", content: trimmedInput };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmedInput, profile, eqState, userId }),
        });

        const data = await res.json();

        if (data.type === "eq-followup") {
          setEqState?.((prev) => ({
            ...prev,
            answers: { ...prev.answers, [data.key]: trimmedInput },
          }));
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `🔍 ${data.question}` },
          ]);
        } else if (data.type === "eq-diagnosis") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🧠 Diagnosis: ${data.label}\n\nRecommended Drills:\n${data.drills.join("\n")}`,
            },
          ]);
          setEqState?.({});
        } else if (data.assistantMessage) {
          setMessages((prev) => [...prev, data.assistantMessage]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "⚠️ Unrecognized response format." },
          ]);
        }
      } catch (err) {
        console.error("❌ Chat error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Unable to respond. Please try again." },
        ]);
      }
    }

    setLoading(false);
  };

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
            darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-4">
            <img src="/deeplogo.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-xl font-semibold">Koval Deep AI</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {profile?.nickname || userId}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400">
              Welcome to {BOT_NAME}! How can I assist you today?
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-xl px-4 py-3 rounded-xl whitespace-pre-wrap ${
                m.role === "assistant"
                  ? darkMode
                    ? "bg-gray-800 text-white self-start shadow"
                    : "bg-teal-100 text-black self-start shadow"
                  : darkMode
                  ? "bg-blue-700 text-white self-end shadow"
                  : "bg-blue-600 text-white self-end shadow"
              }`}
            >
              <strong>{m.role === "user" ? "You" : BOT_NAME}:</strong>
              <div>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="text-gray-400 italic">{BOT_NAME} is thinking...</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className={`w-full flex flex-col gap-3 p-4 border-t ${
            darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"
          }`}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or upload dive images..."
            className={`resize-none rounded-md p-3 text-sm h-20 shadow-md focus:outline-none ${
              darkMode
                ? "bg-gray-900 text-white placeholder-gray-500"
                : "bg-white text-black placeholder-gray-400"
            }`}
            onKeyDown={handleKeyDown}
          />

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/png, image/jpeg"
              multiple
              onChange={handleFileChange}
              className="text-sm"
            />
            {uploadMessage && <p className="text-xs">{uploadMessage}</p>}
          </div>

          {files.length > 0 && (
            <div className="flex gap-2 mt-2">
              {files.map((file, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${i}`}
                  className="w-16 h-16 object-cover rounded border shadow"
                />
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!input.trim() && files.length === 0)}
            className={`mt-1 px-5 py-3 rounded-md font-semibold ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : darkMode
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
}