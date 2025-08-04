import { useState } from "react";
import FilePreview from "./FilePreview";

export default function ChatInput({
  input,
  setInput,
  handleSubmit,
  handleKeyDown,
  handleFileChange,
  files,
  setFiles,
  loading,
  darkMode,
}) {
  const [error, setError] = useState("");

  // Unified file handler
  const onFilesChange = (e) => {
    const selected = Array.from(e.target.files);

    if (selected.length > 3) {
      setError("⚠️ You can only upload up to 3 images at a time.");
    }

    const imageFiles = selected.filter((file) => {
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        setError("❌ Only PNG and JPEG files are allowed.");
        return false;
      }
      return true;
    });

    setFiles(imageFiles.slice(0, 3));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className={`w-full flex flex-col gap-3 p-4 border-t ${
        darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"
      }`}
    >
      <label htmlFor="chatInput" className="sr-only">
        Message
      </label>

      {/* Text Input */}
      <textarea
        id="chatInput"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message or upload dive profiles..."
        className={`resize-none rounded-md p-3 text-sm h-20 shadow-md focus:outline-none ${
          darkMode
            ? "bg-gray-900 text-white placeholder-gray-500"
            : "bg-white text-black placeholder-gray-400"
        }`}
        onKeyDown={handleKeyDown}
      />

      {/* File Upload */}
      <input
        type="file"
        accept="image/png, image/jpeg"
        multiple
        onChange={handleFileChange || onFilesChange}
        className="text-sm"
        aria-label="Upload image files"
      />

      {/* Error Message */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Warning Message */}
      {files.length >= 3 && (
        <p className="text-xs text-yellow-500">
          ⚠️ Only 3 images can be uploaded at a time.
        </p>
      )}

      {/* File Previews */}
      <FilePreview files={files} setFiles={setFiles} />

      {/* Send Button */}
      <button
        type="submit"
        className={`mt-1 px-5 py-3 rounded-md font-semibold transition-all ${
          loading
            ? "opacity-50 cursor-not-allowed"
            : darkMode
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
        disabled={loading || (!input.trim() && files.length === 0)}
      >
        {loading ? "Thinking..." : "Send"}
      </button>
    </form>
  );
}
