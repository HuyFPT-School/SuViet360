"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { chatbotApi, ChatbotSource } from "@/lib/chatbotApi";

interface Message {
  role: "system" | "user" | "ai";
  text: string;
  sources?: ChatbotSource[];
}

export default function AIChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      text: "Chào bạn! Tôi là Trợ lý AI Sử Việt. Hãy đặt bất kỳ câu hỏi nào về Lịch sử Việt Nam, tôi sẽ hỗ trợ giải đáp dựa trên nguồn dữ liệu tin cậy.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [showSourcesIdx, setShowSourcesIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // Close chatbot when pressing ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!user) return null; // Only show to logged in users

  const handleSend = async () => {
    if (!question.trim() || loading) return;

    const currentQuestion = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: currentQuestion }]);
    setLoading(true);

    try {
      const response = await chatbotApi.ask(currentQuestion);
      
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: response.success ? response.answer : "Xin lỗi, đã xảy ra lỗi trong quá trình xử lý câu trả lời.",
          sources: response.sources,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Không thể kết nối với máy chủ AI. Vui lòng kiểm tra cấu hình mạng hoặc thử lại sau.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSources = (idx: number) => {
    setShowSourcesIdx(showSourcesIdx === idx ? null : idx);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* CHAT WINDOW */}
      {isOpen && (
        <div 
          className="mb-4 w-[340px] sm:w-[380px] h-[520px] rounded-2xl border border-amber-200 bg-[#fdfbf7] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right"
          style={{
            backgroundImage: "linear-gradient(rgba(253, 251, 247, 0.95), rgba(253, 251, 247, 0.95)), url('/textures/paper.jpg')",
            backgroundSize: "cover",
          }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-900 to-amber-950 px-4 py-3 flex items-center justify-between border-b border-amber-800 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100/10 flex items-center justify-center border border-amber-200/20">
                <svg className="w-4 h-4 text-amber-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-amber-50 tracking-wide uppercase">Sử Việt Trợ Lý AI</h4>
                <p className="text-[10px] text-amber-200/80 font-medium">Trực tuyến • Hỗ trợ học tập</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-amber-200/70 hover:text-amber-50 p-1 rounded-lg transition-colors focus:outline-none"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs border ${
                    msg.role === "user" 
                      ? "bg-amber-800 border-amber-900 text-white rounded-br-none" 
                      : msg.role === "system"
                      ? "bg-stone-100 border-stone-200 text-stone-600 rounded-bl-none italic text-xs"
                      : "bg-white border-amber-100 text-stone-800 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>

                {/* RAG sources references */}
                {msg.role === "ai" && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-1 pl-1">
                    <button 
                      onClick={() => toggleSources(idx)}
                      className="text-[10px] text-amber-850 hover:text-amber-900 font-bold uppercase tracking-wider flex items-center gap-1 focus:outline-none"
                    >
                      <svg className={`w-3 h-3 transition-transform ${showSourcesIdx === idx ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span>Xem nguồn tài liệu ({msg.sources.length})</span>
                    </button>
                    
                    {showSourcesIdx === idx && (
                      <div className="mt-2 bg-amber-50/50 border border-amber-150 rounded-xl p-2.5 max-w-[90%] space-y-2 text-[11px] text-stone-600 shadow-inner">
                        {msg.sources.map((src, sIdx) => (
                          <div key={sIdx} className="border-b border-amber-100/50 pb-1.5 last:border-b-0 last:pb-0">
                            <span className="font-semibold text-amber-900">Nguồn {sIdx + 1}: </span>
                            <span>{src.question} &rarr; </span>
                            <span className="italic text-stone-500">{src.answer}</span>
                            <div className="mt-0.5 text-[9px] text-stone-400 font-medium">Độ khớp: {Math.round(src.score * 100)}%</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-amber-850 font-bold text-xs italic animate-pulse">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>AI đang tìm cứu sử liệu...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white/80 border-t border-amber-150 flex gap-2">
            <input 
              type="text"
              placeholder="Hỏi trợ lý Sử Việt..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
              className="flex-1 min-w-0 bg-stone-50 border border-amber-200 rounded-xl px-3 py-1.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-700/50 focus:border-transparent disabled:opacity-50"
            />
            <button 
              onClick={handleSend}
              disabled={loading || !question.trim()}
              className="bg-amber-850 hover:bg-amber-900 disabled:opacity-50 text-white font-bold p-2.5 rounded-xl transition-colors shadow-md flex items-center justify-center shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* FLOAT BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-800 to-amber-950 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-300 focus:outline-none border-2 border-amber-600/30 group relative"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        
        {/* Tooltip */}
        {!isOpen && (
          <span className="absolute right-16 scale-0 group-hover:scale-100 transition-all duration-200 bg-amber-950 text-amber-50 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded shadow-md border border-amber-800 pointer-events-none whitespace-nowrap">
            Trợ lý AI Sử Việt
          </span>
        )}
      </button>
    </div>
  );
}
