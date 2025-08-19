import { useState } from "react";
import FilePreview from "./FilePreview";

export default function ChatInput({
  input,
  setInput,
  handleSubmit,
  handleKeyDown,
  files,
  setFiles,
  loading,
  isAuthenticating,
  authTimeoutReached,
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
    <div className="relative">
      {error && (
        <div className={`mb-2 p-2 rounded text-sm ${
          darkMode ? "bg-red-900/20 text-red-300" : "bg-red-50 text-red-600"
        }`}>
          {error}
        </div>
      )}
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="relative"
      >
        <div className={`relative rounded-3xl border ${
          darkMode 
            ? "border-gray-600 bg-gray-700" 
            : "border-gray-300 bg-white"
        } shadow-sm`}>
          {/* File previews */}
          {files.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-600">
              <FilePreview
                files={files}
                setFiles={setFiles}
                darkMode={darkMode}
              />
            </div>
          )}

          <div className="flex items-end p-3">
            {/* File upload button */}
            <button
              type="button"
              className={`p-2 rounded-lg mr-2 transition-colors ${
                darkMode
                  ? "hover:bg-gray-600 text-gray-400"
                  : "hover:bg-gray-100 text-gray-500"
              }`}
              onClick={() => document.getElementById('file-upload').click()}
            >
              📎
            </button>
            <input
              id="file-upload"
              type="file"
              multiple
              accept="image/*"
              onChange={onFilesChange}
              className="hidden"
            />

            {/* Text input */}
            <textarea
              id="chatInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAuthenticating && !authTimeoutReached
                  ? "Authenticating..."
                  : "Message Koval AI..."
              }
              disabled={loading || (isAuthenticating && !authTimeoutReached)}
              className={`flex-1 resize-none bg-transparent border-none outline-none max-h-32 ${
                darkMode ? "text-white placeholder-gray-400" : "text-gray-900 placeholder-gray-500"
              } disabled:opacity-50`}
              rows="1"
              style={{
                minHeight: '24px',
                lineHeight: '24px'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={
                loading ||
                !input.trim() ||
                (isAuthenticating && !authTimeoutReached)
              }
              className={`ml-2 p-2 rounded-lg transition-all ${
                input.trim() && !loading && (!isAuthenticating || authTimeoutReached)
                  ? darkMode
                    ? "bg-white text-black hover:bg-gray-100"
                    : "bg-black text-white hover:bg-gray-800"
                  : darkMode
                    ? "bg-gray-600 text-gray-400"
                    : "bg-gray-200 text-gray-400"
              } disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                "↗"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
