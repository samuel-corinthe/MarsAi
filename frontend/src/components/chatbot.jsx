import React, { useState, useRef, useEffect } from "react";

export default function FaqChatbot() {
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll à chaque nouveau message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setIsLoading(true);

    setChatHistory((prev) => [...prev, { user: userMsg, bot: "En train de réfléchir..." }]);

    try {
      const res = await fetch("http://localhost:5000/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      // GESTION FALLBACK : Si le serveur répond mais avec une erreur (ex: 500 ou 404)
      if (!res.ok) {
        throw new Error("Erreur HTTP " + res.status);
      }

      const data = await res.json();

      // GESTION FALLBACK : Si la réponse est vide ou malformée
      const botReply = data.reply || "Désolé, je n'ai pas pu formuler une réponse. Pouvez-vous reformuler ?";

      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { user: userMsg, bot: botReply },
      ]);
    } catch (err) {
      // GESTION FALLBACK : Erreur réseau, serveur éteint, ou crash
      console.error("Chatbot Error:", err);
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { 
          user: userMsg, 
          bot: "Oups ! Je rencontre un petit problème technique. 🔌 Vérifiez votre connexion ou réessayez plus tard." 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  const clearChat = () => {
    setChatHistory([]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70] font-sans">
      {/* Chat Window */}
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 origin-bottom-right ${
          isOpen ? "w-80 h-[450px] md:w-96 opacity-100 scale-100" : "w-0 h-0 opacity-0 scale-0 invisible"
        }`}
      >
        {isOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Assistant MarsAI</h3>
                <p className="text-[10px] opacity-80">En ligne pour vous aider</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
            >
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-10">
                  <div className="text-4xl mb-2">🤖</div>
                  <p>Bonjour! 👋</p>
                  <p className="text-xs px-6">Posez-moi vos questions sur le festival (dates, accès, programmation...)</p>
                </div>
              ) : (
                chatHistory.map((chat, index) => (
                  <div key={index} className="flex flex-col space-y-1">
                    {/* User */}
                    <div className="flex justify-end">
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-tr-none text-sm max-w-[85%] shadow-sm">
                        {chat.user}
                      </div>
                    </div>
                    {/* Bot */}
                    <div className="flex justify-start">
                      <div className={`${
                        chat.bot.includes("Oups") ? "bg-red-50 text-red-700 border border-red-100" : "bg-white text-gray-800 border border-gray-200"
                      } px-4 py-2 rounded-2xl rounded-tl-none text-sm max-w-[85%] shadow-sm`}>
                        {chat.bot}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isLoading}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder={isLoading ? "Réflexion..." : "Écrivez ici..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                />
                <button
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 transition disabled:bg-gray-300"
                  onClick={handleSend}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              {chatHistory.length > 0 && (
                <button
                  onClick={clearChat}
                  className="w-full text-[10px] text-gray-400 hover:text-red-500 mt-2 uppercase tracking-widest transition"
                >
                  Réinitialiser la conversation
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
          isOpen
            ? "bg-white text-gray-500 rotate-90"
            : "bg-blue-600 text-white hover:scale-110 active:scale-95"
        }`}
      >
        {isOpen ? (
          <span className="text-2xl">✕</span>
        ) : (
          <div className="relative">
            <span className="text-3xl">💬</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
}