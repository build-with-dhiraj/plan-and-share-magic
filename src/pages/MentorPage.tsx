import { useState, useRef, useEffect } from "react";
import { Bot, Sparkles, Send, Square, Trash2, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMentorChat, type ChatMessage } from "@/hooks/useMentorChat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTIONS = [
  "Explain the significance of the 16th Finance Commission",
  "Compare India's DPI with other G20 nations",
  "What are the key environmental judgments of 2024?",
  "Create a revision plan for GS Paper 2",
  "Explain the difference between Money Bill and Finance Bill",
  "What are my weak topics? Help me improve.",
];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-accent"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? "bg-primary/15" : "bg-accent/15"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-accent" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted/60 text-foreground rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_a]:text-accent [&_a]:underline [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_li]:mb-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const MentorPage = () => {
  const { messages, isLoading, sendMessage, stopStreaming, clearChat } =
    useMentorChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleSuggestion = (s: string) => {
    setInput("");
    sendMessage(s);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="container max-w-3xl py-4 px-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              AI Study Mentor
            </h1>
            <p className="text-xs text-muted-foreground">
              Powered by your content pipeline • GPT-4.1
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden relative">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Sparkles className="h-10 w-10 text-accent mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground mb-6">
              Ask anything about current affairs, get UPSC-focused answers with
              citations from your database
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent/10 hover:border-accent/40 text-xs py-1.5 px-3 transition-colors"
                  onClick={() => handleSuggestion(s)}
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto space-y-4 pr-2 pb-2"
          >
            <AnimatePresence>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} />
              ))}
            </AnimatePresence>
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="bg-muted/60 rounded-2xl rounded-tl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask your study mentor..."
          className="flex-1"
          disabled={isLoading}
        />
        {isLoading ? (
          <Button
            size="icon"
            variant="outline"
            onClick={stopStreaming}
            className="shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-primary text-primary-foreground shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MentorPage;
