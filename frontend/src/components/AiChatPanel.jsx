import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";

export default function AiChatPanel({ boardId, authHeaders }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "ai", text: "Xin chào! Mình có thể đọc nội dung trên bảng, bạn cần giúp gì?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const newMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:5000/api/board/${boardId}/chat`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ message: newMsg.text })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "ai", text: `Lỗi: ${data.error || "Không xác định"}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "ai", text: data.reply || "Không có phản hồi từ AI" }]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "ai", text: "Lỗi kết nối đến server AI!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Open chatbot button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute bottom-16 right-6 bg-purple-600 p-4 rounded-full text-white shadow-lg hover:scale-105 transition-transform z-50"
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat */}
      {isOpen && (
        <div className="absolute bottom-24 right-6 w-80 bg-white shadow-2xl rounded-2xl border border-slate-200 flex flex-col overflow-hidden h-[400px] z-50">
          <div className="bg-purple-600 text-white p-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              <span className="font-bold text-sm">Board Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-purple-700 p-1 rounded transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div ref={chatContainerRef} className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`p-2.5 max-w-[85%] rounded-xl text-sm ${m.role === "ai" ? "bg-white border text-slate-800 rounded-tl-none shadow-sm" : "bg-purple-100 text-purple-900 ml-auto rounded-tr-none shadow-sm"}`}>
                {m.text}
              </div>
            ))}
            {isLoading && (
              <div className="text-xs text-slate-400 p-2 bg-white border rounded-xl rounded-tl-none max-w-[85%] w-fit shadow-sm animate-pulse">
                AI đang suy nghĩ...
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t flex gap-2">
            <input 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all" 
              placeholder="Hỏi AI về bảng này..." 
            />
            <button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim()}
              className="bg-purple-600 disabled:bg-purple-400 text-white p-2 rounded-lg transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
