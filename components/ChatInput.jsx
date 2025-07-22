import FilePreview from "./FilePreview"; // ✅ CORRECT

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
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      className={`w-full flex flex-col gap-3 p-4 border-t ${
        darkMode ? "border-gray-700 bg-[#1a1a1a]" : "border-gray-200 bg-gray-100"
      }`}
    >
      <textarea
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

      <input
        type="file"
        accept="image/png, image/jpeg"
        multiple
        onChange={handleFileChange}
        className="text-sm"
      />

      {/* ✅ Image Previews */}
      <FilePreview files={files} setFiles={setFiles} />

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
