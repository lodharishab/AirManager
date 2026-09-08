import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, X, Send, Loader2, Sparkles, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: number;
  role: string;
  content: string;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const createConversation = async () => {
    const res = await apiRequest("POST", "/api/ai-chat/conversations", { title: "New Chat" });
    const conv = await res.json();
    setConversationId(conv.id);
    return conv.id;
  };

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return;

    const userMessage = message.trim();
    setMessage("");

    let convId = conversationId;
    if (!convId) {
      convId = await createConversation();
    }

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: userMessage,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantMsg: ChatMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const response = await fetch(`/api/ai-chat/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.content,
                  };
                }
                return updated;
              });
            }
          } catch { /* SSE line parse or delete failures are non-fatal */ }
        }
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: "Sorry, I encountered an error. Please try again.",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleClear = async () => {
    if (conversationId) {
      try {
        await apiRequest("DELETE", `/api/ai-chat/conversations/${conversationId}`);
      } catch { /* cleanup delete failure is non-fatal */ }
    }
    setMessages([]);
    setConversationId(null);
  };

  return (
    <>
      {!isOpen && (
        <button
          data-testid="button-open-chatbot"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
        >
          <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-sm font-serif tracking-wide text-primary">AirManager AI</h3>
                <p className="text-[10px] text-muted-foreground">Property management assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  data-testid="button-clear-chat"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={handleClear}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                data-testid="button-close-chatbot"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h4 className="font-serif text-primary font-bold text-lg mb-2">Welcome to AirManager AI</h4>
                <p className="text-sm text-muted-foreground mb-6">Your property management assistant. Ask me about bookings, revenue, guest communications, or pricing strategy.</p>
                <div className="space-y-2 w-full">
                  {["How can I improve occupancy rates?", "Draft a welcome message for guests", "Suggest pricing for peak season"].map((suggestion) => (
                    <button
                      key={suggestion}
                      data-testid={`button-suggestion-${suggestion.slice(0, 10)}`}
                      onClick={() => {
                        setMessage(suggestion);
                        setTimeout(() => {
                          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                          handleSend();
                        }, 100);
                      }}
                      className="w-full text-left text-xs p-3 rounded-xl border border-border/50 text-muted-foreground hover:bg-secondary/20 hover:text-foreground hover:border-primary/30 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary/30 text-foreground border border-border rounded-bl-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  {msg.role === "assistant" && !msg.content && isStreaming && (
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-center gap-2 relative">
              <Input
                ref={inputRef}
                data-testid="input-chatbot-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask AirManager AI..."
                className="flex-1 bg-background border-border rounded-full pl-4 pr-12 h-10 text-sm"
                disabled={isStreaming}
              />
              <Button
                data-testid="button-send-chatbot"
                size="icon"
                className="absolute right-1 rounded-full w-8 h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleSend}
                disabled={isStreaming || !message.trim()}
              >
                {isStreaming ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 ml-0.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
