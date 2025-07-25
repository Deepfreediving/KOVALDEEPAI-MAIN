import { useEffect, useState, useRef } from "react";
import ChatInput from "../components/ChatInput";
import ChatMessages from "../components/ChatMessages";

export default function Chat() {
  const BOT_NAME = "Koval AI";
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [storedUsername, setStoredUsername] = useState("");
  const [profile, setProfile] = useState({});
  const [eqState, setEqState] = useState({
    currentDepth: null,
    answers: {},
    alreadyAsked: [],
  });

  const bottomRef = useRef(null);

  useEffect(() => {
    const localUsername =
      localStorage.getItem("kovalUser") ||
      (() => {
        const newUser = "Guest" + Math.floor(Math.random() * 1000);
        localStorage.setItem("kovalUser", newUser);
        return newUser;
      })();
    setStoredUsername(localUsername);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3);
    setFiles(selected);
  };

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;

    setLoading(true);

    let threadId = localStorage.getItem("kovalThreadId");
    if (!threadId) {
      try {
        const threadRes = await fetch("/api/create-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: storedUsername }),
        });
        const threadData = await threadRes.json();
        threadId = threadData.threadId;
        localStorage.setItem("kovalThreadId", threadId);
      } catch (err) {
        console.error("❌ Thread creation failed:", err);
        setLoading(false);
        return;
      }
    }

    if (files.length > 0) {
      try {
        const formData = new FormData();
        formData.append("image", files[0]);

        const uploadRes = await fetch("/api/upload-dive-image", {
          method: "POST",
          body: formData,
        });

        const contentType = uploadRes.headers.get("content-type");
        const uploadData = contentType?.includes("application/json")
          ? await uploadRes.json()
          : { error: "Server returned non-JSON." };

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: uploadData?.answer || uploadData?.error || "⚠️ Image processing failed.",
          },
        ]);
      } catch (err) {
        console.error("❌ Upload error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Upload failed. Try again.",
          },
        ]);
      } finally {
        setFiles([]);
      }
    }

    if (trimmedInput) {
      setMessages((prev) => [...prev, { role: "user", content: trimmedInput }]);
      setInput("");

      try {
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmedInput,
            thread_id: threadId,
            username: storedUsername,
            profile,
            eqState,
          }),
        });

        const chatData = await chatRes.json();

        // === Intake Profile Follow-up ===
        if (chatData?.type === "intake") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: chatData.question },
          ]);
          setProfile((prev) => ({
            ...prev,
            [chatData.key]: "", // Capture new field
          }));
          setLoading(false);
          return;
        }

        // === EQ Engine Follow-up ===
        if (chatData?.type === "eq-followup") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: chatData.question },
          ]);
          setEqState((prev) => ({
            ...prev,
            alreadyAsked: [...(prev.alreadyAsked || []), chatData.key],
          }));
          setLoading(false);
          return;
        }

        // === EQ Engine Diagnosis ===
        if (chatData?.type === "eq-diagnosis") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🩺 Diagnosis: ${chatData.label}\n\nSuggested drills:\n${chatData.drills.join(
                "\n"
              )}`,
            },
          ]);
          setLoading(false);
          return;
        }

        const assistantContent =
          chatData?.assistantMessage?.content ||
          chatData?.error ||
          "⚠️ No response generated.";

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantContent },
        ]);
      } catch (err) {
        console.error("❌ Chat error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Network error. Please try again." },
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
      className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-300 ${
        darkMode ? "bg-black text-white" : "bg-white text-gray-900"
      }`}
    >
      <div
        className={`w-full max-w-3xl h-screen flex flex-col rounded-xl overflow-hidden shadow-lg border ${
          darkMode ? "border-gray-700 bg-[#121212]" : "border-gray-300 bg-white"
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"
          }`}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-4">
              <img src="/deeplogo.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
              <h1 className="text-xl font-semibold">Koval Deep AI</h1>
            </div>
            <p className="text-xs mt-1 text-gray-500">User ID: {storedUsername}</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`px-4 py-1 rounded-md border text-sm transition-colors ${
              darkMode
                ? "bg-white text-black hover:bg-gray-200"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        <ChatMessages
          messages={messages}
          BOT_NAME={BOT_NAME}
          darkMode={darkMode}
          loading={loading}
          bottomRef={bottomRef}
        />

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
