import { useRef } from "react";
import DiveJournalForm from "./DiveJournalForm";

export default function Sidebar({
  sessionName,
  sessionsList,
  showDiveJournalForm,
  diveLogs,
  toggleDiveJournal,
  handleSelectSession,
  handleDeleteSession,
  handleSaveSession,
  startNewSession,
  handleJournalSubmit,
  editLogIndex,
  handleEdit,
  handleDelete,
  userId,
  setLoading,
  setMessages,
  darkMode
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload-dive-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const feedback = data?.answer || "✅ Image uploaded, but no analysis returned.";

      setMessages((prev) => [
        ...prev,
        { role: "user", content: "Uploaded a dive profile image." },
        { role: "assistant", content: feedback },
      ]);
    } catch (err) {
      console.error("Image upload error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Error analyzing image. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className={`w-72 h-screen overflow-y-auto border-r p-4 flex flex-col justify-between ${
        darkMode ? "bg-[#121212] text-white border-gray-700" : "bg-gray-100 text-black border-gray-200"
      }`}
    >
      <div>
        <h2 className="text-lg font-semibold mb-4">🗂️ Sessions</h2>

        <button onClick={startNewSession} className="mb-4 text-blue-600 underline">
          ➕ New Session
        </button>

        <ul className="space-y-2 mb-6">
          {sessionsList.map((s, i) => (
            <li key={i} className="flex justify-between items-center">
              <button
                className={`text-left flex-1 px-2 py-1 rounded ${
                  s.sessionName === sessionName
                    ? "bg-blue-100 dark:bg-blue-700"
                    : darkMode
                    ? "hover:bg-gray-800"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => handleSelectSession(s.sessionName)}
              >
                {s.sessionName}
              </button>
              <button
                onClick={() => handleDeleteSession(i)}
                className="text-red-500 text-xs ml-2"
                title="Delete session"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={toggleDiveJournal}
          className={`mb-4 text-left w-full px-3 py-2 rounded border ${
            darkMode
              ? "bg-blue-900 hover:bg-blue-800 text-white"
              : "bg-blue-50 hover:bg-blue-100 text-black"
          }`}
        >
          {showDiveJournalForm ? "📕 Close Dive Journal" : "📘 Open Dive Journal"}
        </button>

        {showDiveJournalForm ? (
          <DiveJournalForm
            onSubmit={handleJournalSubmit}
            existingEntry={editLogIndex !== null ? diveLogs[editLogIndex] : null}
          />
        ) : (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">📒 Dive Logs</h3>
            <ul className="space-y-2">
              {diveLogs.map((log, i) => (
                <li key={i} className={`border p-2 rounded text-sm ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}>
                  <strong>{log.date}</strong> – {log.disciplineType}: {log.targetDepth}m
                  <div className="flex justify-end space-x-2 mt-1">
                    <button onClick={() => handleEdit(i)} className="text-blue-500 text-xs">🖊️ Edit</button>
                    <button onClick={() => handleDelete(i)} className="text-red-500 text-xs">🗑️ Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-semibold mb-2">📤 Upload Dive Profile Image</h3>
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleFileChange}
            ref={fileInputRef}
            className={`block w-full text-sm ${
              darkMode
                ? "bg-gray-900 text-white border border-gray-600"
                : "bg-white text-gray-900 border border-gray-300"
            } rounded cursor-pointer focus:outline-none`}
          />
        </div>
      </div>

      <button
        onClick={handleSaveSession}
        className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 mt-4"
      >
        💾 Save Session
      </button>
    </aside>
  );
}
