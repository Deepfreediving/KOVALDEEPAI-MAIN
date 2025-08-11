// components/ChatMessages.jsx
export default function ChatMessages({ messages, BOT_NAME, darkMode, loading, bottomRef, userId }) {
  // ✅ Generate consistent user display name from member ID
  const getUserDisplayName = () => {
    if (!userId || userId.startsWith('guest')) {
      return "👤 Guest User";
    }
    // Use member ID format for consistent, fast recognition
    return `👤 User-${userId}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-400">
          Welcome to {BOT_NAME}! How can I assist you today?
        </div>
      )}

      {messages.map((m, i) => (
        <div
          key={i}
          className={`max-w-xl px-4 py-3 rounded-xl whitespace-pre-wrap transition-all duration-300 ease-in-out ${
            m.role === "assistant"
              ? darkMode
                ? "bg-gray-800 text-white self-start shadow"
                : "bg-teal-100 text-black self-start shadow"
              : darkMode
              ? "bg-blue-700 text-white self-end shadow"
              : "bg-blue-600 text-white self-end shadow"
          }`}
        >
          <strong>{m.role === "user" ? getUserDisplayName() : BOT_NAME}:</strong>
          <div>{m.content}</div>
        </div>
      ))}

      {loading && (
        <div className="text-gray-400 italic">{BOT_NAME} is thinking...</div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
