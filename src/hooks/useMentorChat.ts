import { useState, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_URL = "https://ligyvjuwvjeiiywxgewy.supabase.co/functions/v1/mentor-chat";

export function useMentorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (input: string) => {
      const userMsg: ChatMessage = { role: "user", content: input };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setIsLoading(true);

      let assistantSoFar = "";
      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      try {
        const controller = new AbortController();
        abortRef.current = controller;

        // Get the user's session token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          toast({ title: "Not logged in", description: "Please sign in to use the mentor.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ3l2anV3dmplaWl5d3hnZXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDEyMDQsImV4cCI6MjA4ODYxNzIwNH0.gAabUifSd4OIJpZ-ucj8Jk9JpJZ8J3jZLXuvnLpVxEU",
          },
          body: JSON.stringify({ messages: allMessages }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Request failed" }));
          if (resp.status === 429) {
            toast({ title: "Rate limited", description: "Please wait a moment and try again.", variant: "destructive" });
          } else {
            toast({ title: "Error", description: err.error || "Something went wrong", variant: "destructive" });
          }
          setIsLoading(false);
          return;
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsert(content);
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        // Flush remaining
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsert(content);
            } catch {}
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("Mentor chat error:", e);
          toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, stopStreaming, clearChat };
}
