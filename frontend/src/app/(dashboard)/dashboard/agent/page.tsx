"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Trash2, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sendAgentMessage, type Message } from "@/lib/api";

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I'm your CallCleric assistant. I can help you manage calls, emails, calendar events, and more. What would you like to do today?",
};

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages: Message[] = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    abortRef.current = new AbortController();

    try {
      const data = await sendAgentMessage(nextMessages, abortRef.current.signal);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "CanceledError") {
        setError("Failed to reach the agent. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    abortRef.current?.abort();
    setMessages([WELCOME]);
    setInput("");
    setError("");
    setLoading(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">AI Agent</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Chat with your CallCleric assistant
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-gray-500 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-6">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                msg.role === "assistant"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              )}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "assistant"
                  ? "rounded-tl-sm bg-white text-gray-900 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-800"
                  : "rounded-tr-sm bg-indigo-600 text-white"
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Thinking…</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-8 py-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-end gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your agent… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="max-h-40 min-h-[44px] flex-1 resize-none"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="h-11 w-11 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
          Connected to{" "}
          <code className="font-mono">
            {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}
          </code>
        </p>
      </div>
    </div>
  );
}
