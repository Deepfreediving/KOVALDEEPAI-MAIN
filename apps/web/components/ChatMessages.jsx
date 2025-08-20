// components/ChatMessages.jsx
export default function ChatMessages({
  messages,
  BOT_NAME,
  darkMode,
  loading,
  bottomRef,
}) {

  return (
    <div className="w-full space-y-6 px-4 py-6">
      {messages.length === 0 && (
        <div className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          <div className="mb-4">
            <h1 className={`text-3xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {BOT_NAME}
            </h1>
            <p className="text-lg">How can I help you today?</p>
          </div>
        </div>
      )}

      {messages.map((m, i) => (
        <div
          key={i}
          className={`group relative ${
            m.role === "assistant" 
              ? darkMode ? "bg-gray-800" : "bg-gray-50"
              : ""
          }`}
        >
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {m.role === "assistant" ? (
                  <img 
                    src="/daniel1 copy.png" 
                    alt="Daniel Avatar" 
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    darkMode ? "bg-purple-600 text-white" : "bg-purple-500 text-white"
                  }`}>
                    👤
                  </div>
                )}
              </div>
              
              {/* Message content */}
              <div className="flex-1 min-w-0">
                <div className={`prose max-w-none ${
                  darkMode 
                    ? "prose-invert text-gray-100" 
                    : "text-gray-900"
                }`}>
                  <div className="whitespace-pre-wrap">
                    {m.content}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {loading && (
        <div className={`group relative ${darkMode ? "bg-gray-800" : "bg-gray-50"}`}>
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <img 
                  src="/daniel1 copy.png" 
                  alt="Daniel Avatar" 
                  className="w-16 h-16 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`flex items-center space-x-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
