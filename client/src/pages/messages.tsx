import { useState } from "react";
import { useConversations, useMessages, useSendMessage } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, MoreVertical, Phone, Video, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Conversation } from "@shared/schema";

export default function Messages() {
  const { data: conversations, isLoading: convsLoading } = useConversations();
  const [activeConvId, setActiveConvId] = useState<number | undefined>(undefined);
  const [message, setMessage] = useState("");
  const sendMessage = useSendMessage();

  const allConversations = conversations || [];
  const activeChat = allConversations.find(c => c.id === activeConvId) || allConversations[0];
  const { data: chatMessages, isLoading: msgsLoading } = useMessages(activeChat?.id);
  const allMessages = chatMessages || [];

  const handleSend = () => {
    if (!message.trim() || !activeChat) return;
    const now = new Date();
    const sentAt = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    sendMessage.mutate({
      conversationId: activeChat.id,
      senderName: "Host",
      senderType: "host",
      content: message,
      sentAt,
    });
    setMessage("");
  };

  if (convsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allConversations.length === 0) {
    return (
      <div className="h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight font-serif text-primary">Messages</h1>
          <p className="text-muted-foreground mt-1">No conversations yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
      <div className="mb-6">
        <h1 data-testid="text-messages-title" className="text-3xl font-bold tracking-tight font-serif text-primary">Messages</h1>
        <p className="text-muted-foreground mt-1">Communicate with your guests.</p>
      </div>

      <Card className="flex-1 overflow-hidden shadow-sm border-border flex">
        <div className="w-1/3 border-r border-border flex flex-col bg-card/50">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                data-testid="input-search-messages"
                placeholder="Search messages..." 
                className="pl-9 bg-background border-border"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {allConversations.map((chat) => (
              <div 
                key={chat.id} 
                data-testid={`card-conversation-${chat.id}`}
                onClick={() => setActiveConvId(chat.id)}
                className={`p-4 border-b border-border/50 cursor-pointer transition-colors flex items-start gap-3 ${
                  activeChat?.id === chat.id ? 'bg-secondary/30' : 'hover:bg-secondary/10'
                }`}
              >
                <Avatar className="border border-primary/20">
                  <AvatarImage src={chat.avatarUrl || undefined} />
                  <AvatarFallback>{chat.guestName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-sm truncate pr-2 text-foreground font-serif tracking-wide">{chat.guestName}</h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{chat.lastMessageTime}</span>
                  </div>
                  <p className="text-xs text-primary/80 mb-1 truncate">{chat.propertyName}</p>
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-background/50">
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50">
            <div className="flex items-center gap-3">
              <Avatar className="border border-primary/20">
                <AvatarImage src={activeChat?.avatarUrl || undefined} />
                <AvatarFallback>{activeChat?.guestName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-bold font-serif tracking-wide text-foreground">{activeChat?.guestName}</h2>
                <p className="text-xs text-primary/80">{activeChat?.propertyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <Phone className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <Video className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground bg-secondary/20 px-3 py-1 rounded-full">Today</span>
            </div>
            
            {msgsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              allMessages.map((msg) => (
                msg.senderType === "guest" ? (
                  <div key={msg.id} className="flex gap-3 max-w-[80%]">
                    <Avatar className="w-8 h-8 border border-primary/20 mt-auto">
                      <AvatarImage src={activeChat?.avatarUrl || undefined} />
                      <AvatarFallback>{msg.senderName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="bg-secondary/30 text-foreground p-3 rounded-2xl rounded-bl-sm border border-border">
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">{msg.sentAt}</span>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
                    <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-br-sm shadow-sm">
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-[10px] text-primary-foreground/70 mt-1 block text-right">{msg.sentAt}</span>
                    </div>
                  </div>
                )
              ))
            )}
          </div>

          <div className="p-4 border-t border-border bg-card/50">
            <div className="flex items-center gap-2 relative">
              <Input 
                data-testid="input-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message..." 
                className="flex-1 bg-background border-border rounded-full pl-4 pr-12 h-12"
              />
              <Button 
                data-testid="button-send-message"
                size="icon" 
                className="absolute right-1 rounded-full w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleSend}
                disabled={sendMessage.isPending}
              >
                <Send className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
