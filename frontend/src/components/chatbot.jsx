import React, { useState } from "react";
import faqData from "../utils/faq.json";

export default function FaqChatbot() {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const match = faqData.find((faq) =>
      faq.question.toLowerCase().includes(input.toLowerCase()) ||
      faq.answer.toLowerCase().includes(input.toLowerCase())
    );

    const botReply = match
      ? match.answer
      : "Je n'ai pas la réponse à cette question. Vous pouvez nous contacter à : contact@festival.com";

    setChatHistory([...chatHistory, { user: input, bot: botReply }]);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const clearChat = () => {
    setChatHistory([]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window */}
      <div
        className={`bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
          isOpen ? "w-96 h-96 opacity-100 visible" : "w-0 h-0 opacity-0 invisible"
        }`}
      >
        {isOpen && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h3 className="font-bold text-lg">FAQ Assistant</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-blue-700 rounded-full w-6 h-6 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">
                  <p>Bonjour! 👋</p>
                  <p className="text-xs mt-2">Posez-moi vos questions sur le festival</p>
                </div>
              ) : (
                chatHistory.map((chat, index) => (
                  <div key={index} className="space-y-2">
                    <div className="text-right">
                      <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-lg text-sm max-w-xs break-words">
                        {chat.user}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="inline-block bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-sm max-w-xs break-words">
                        {chat.bot}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Votre question..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                />
                <button
                  className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition text-sm font-medium"
                  onClick={handleSend}
                >
                  ➤
                </button>
              </div>
              {chatHistory.length > 0 && (
                <button
                  onClick={clearChat}
                  className="w-full text-xs text-gray-500 hover:text-gray-700 py-1 transition"
                >
                  Effacer historique
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl ${
          isOpen
            ? "bg-gray-300 text-gray-600 text-2xl"
            : "bg-gradient-to-r from-blue-500 to-blue-600 text-4xl hover:scale-110"
        }`}
        title="Ouvrir le chatbot"
      >
        {isOpen ? "✕" : "🤖"}
      </button>
    </div>
  );
}
