import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, MoreVertical, Phone, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const mockConversations = [
  {
    id: 1,
    name: "Sarah Jenkins",
    property: "Modern Downtown Loft",
    lastMessage: "What time is check-in?",
    time: "10:30 AM",
    unread: 2,
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    id: 2,
    name: "Michael Chen",
    property: "Cozy Mountain Cabin",
    lastMessage: "Thanks for the great stay!",
    time: "Yesterday",
    unread: 0,
    avatar: "https://i.pravatar.cc/150?u=michael"
  },
  {
    id: 3,
    name: "Emily Davis",
    property: "Sunny Beach House",
    lastMessage: "Is parking available?",
    time: "Mon",
    unread: 0,
    avatar: "https://i.pravatar.cc/150?u=emily"
  }
];

export default function Messages() {
  const [activeChat, setActiveChat] = useState(mockConversations[0]);
  const [message, setMessage] = useState("");

  return (
    <div className="h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-serif text-primary">Messages</h1>
        <p className="text-muted-foreground mt-1">Communicate with your guests.</p>
      </div>

      <Card className="flex-1 overflow-hidden shadow-sm border-border flex">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-border flex flex-col bg-card/50">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..." 
                className="pl-9 bg-background border-border"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {mockConversations.map((chat) => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                className={`p-4 border-b border-border/50 cursor-pointer transition-colors flex items-start gap-3 ${
                  activeChat.id === chat.id ? 'bg-secondary/30' : 'hover:bg-secondary/10'
                }`}
              >
                <Avatar className="border border-primary/20">
                  <AvatarImage src={chat.avatar} />
                  <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-sm truncate pr-2 text-foreground font-serif tracking-wide">{chat.name}</h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{chat.time}</span>
                  </div>
                  <p className="text-xs text-primary/80 mb-1 truncate">{chat.property}</p>
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                </div>
                {chat.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                    {chat.unread}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-background/50">
          {/* Chat Header */}
          <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50">
            <div className="flex items-center gap-3">
              <Avatar className="border border-primary/20">
                <AvatarImage src={activeChat.avatar} />
                <AvatarFallback>{activeChat.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-bold font-serif tracking-wide text-foreground">{activeChat.name}</h2>
                <p className="text-xs text-primary/80">{activeChat.property}</p>
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

          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground bg-secondary/20 px-3 py-1 rounded-full">Today</span>
            </div>
            
            <div className="flex gap-3 max-w-[80%]">
              <Avatar className="w-8 h-8 border border-primary/20 mt-auto">
                <AvatarImage src={activeChat.avatar} />
                <AvatarFallback>{activeChat.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="bg-secondary/30 text-foreground p-3 rounded-2xl rounded-bl-sm border border-border">
                <p className="text-sm">Hi! We're really looking forward to our stay. Could you tell me what time check-in is?</p>
                <span className="text-[10px] text-muted-foreground mt-1 block">10:28 AM</span>
              </div>
            </div>

            <div className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse">
              <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-br-sm shadow-sm">
                <p className="text-sm">Hello! We're excited to host you. Check-in is anytime after 3:00 PM. I'll send you the smart lock code on the morning of your arrival.</p>
                <span className="text-[10px] text-primary-foreground/70 mt-1 block text-right">10:30 AM</span>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-border bg-card/50">
            <div className="flex items-center gap-2 relative">
              <Input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..." 
                className="flex-1 bg-background border-border rounded-full pl-4 pr-12 h-12"
              />
              <Button 
                size="icon" 
                className="absolute right-1 rounded-full w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
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