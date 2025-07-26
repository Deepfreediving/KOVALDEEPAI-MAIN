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
  const [userId, setUserId] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [profile, setProfile] = useState({});
  const [eqState, setEqState] = useState({
    currentDepth: null,
    answers: {},
    alreadyAsked: [],
  });

  const bottomRef = useRef(null);

  // Load user ID & profile from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("kovalUser");
    const id = stored || `User${Math.floor(Math.random() * 10000)}`;
    if (!stored) localStorage.setItem("kovalUser", id);
    setUserId(id);

    const savedProfile = JSON.parse(localStorage.getItem("kovalProfile") || "{}");
    setProfile(savedProfile);
  }, []);

  // Thread init (optional)
  useEffect(() => {
    const ensureThread = async () => {
      let id = localStorage.getItem("kovalThreadId");
      if (!id && userId) {
        try {
          const res = await fetch("/api/create-thread", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: userId }),
          });
          const data = await res.json();
          id = data.threadId;
          localStorage.setItem("kovalThreadId", id);
        } catch (err) {
          console.error("❌ Thread init error:", err);
        }
      }
      setThreadId(id);
    };
    ensureThread();
  }, [userId]);

  // Scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3);
    setFiles(selected);
  };

  const saveProfileAnswer = (key, value) => {
    const updated = { ...profile, [key]: value };
    setProfile(updated);
    localStorage.setItem("kovalProfile", JSON.stringify(updated));
  };

  const isExpert =
    parseFloat(profile?.personalBestDepth || 0) >= 80 ||
    profile?.isInstructor ||
    (profile?.certLevel || "").toLowerCase().includes("instructor");

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && files.length === 0) return;

    setLoading(true);

    // === Upload image ===
    if (files.length > 0) {
      try {
        const formData = new FormData();
        formData.append("image", files[0]);

        const uploadRes = await fetch("/api/upload-dive-image", {
          method: "POST",
          body: formData,
        });

        const result = await uploadRes.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result?.answer || result?.error || "⚠️ Image upload failed.",
          },
        ]);
      } catch (err) {
        console.error("❌ Upload error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Upload failed." },
        ]);
      } finally {
        setFiles([]);
      }
    }

    // === Send user message ===
    if (trimmedInput) {
      setMessages((prev) => [...prev, { role: "user", content: trimmedInput }]);
      setInput("");

      try {
        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmedInput,
            userId,
            profile,
            eqState,
            intakeCount: messages.filter(m => m.role === "assistant" && m.content?.includes("question")).length,
          }),
        });

        const data = await chatRes.json();

        // Intake flow
        if (data?.type === "intake") {
          saveProfileAnswer(data.key, trimmedInput);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.question },
          ]);
          setLoading(false);
          return;
        }

        // EQ follow-up
        if (data?.type === "eq-followup") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.question },
          ]);
          setEqState((prev) => ({
            ...prev,
            answers: { ...prev.answers, [data.key]: trimmedInput },
            alreadyAsked: [...(prev.alreadyAsked || []), data.key],
          }));
          setLoading(false);
          return;
        }

        // EQ diagnosis
        if (data?.type === "eq-diagnosis") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🩺 Diagnosis: ${data.label}\n\nSuggested drills:\n${data.drills.join("\n")}`,
            },
          ]);
          setLoading(false);
          return;
        }

        // Default AI reply
        const assistantReply =
          data?.assistantMessage?.content || data?.error || "⚠️ No response.";
        setMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);

      } catch (err) {
        console.error("❌ Chat error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Chat failed." },
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
              <div>
                <h1 className="text-xl font-semibold">Koval Deep AI</h1>
                {isExpert && (
                  <span className="text-xs font-medium text-green-600">
                    🧠 Coach Mode Activated
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs mt-1 text-gray-500">User ID: {userId}</p>
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
