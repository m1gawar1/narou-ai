"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <main className="flex flex-col h-screen bg-background text-foreground max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">なろう小説おすすめAI</h1>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-60 text-center space-y-4">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-2">
              <Bot className="w-8 h-8" />
            </div>
            <p className="text-lg">異世界転生、恋愛、SF...<br />あなたの読みたい小説の気分を教えてください。</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex items-start gap-4",
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1",
                m.role === "user" ? "bg-accent" : "bg-secondary"
              )}>
                {m.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div className={cn(
                "glass rounded-2xl px-5 py-3 max-w-[85%] shadow-sm",
                m.role === "user" ? "bg-primary/10 border-primary/20" : ""
              )}>
                <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                  {m.content}
                </div>

                {/* Tool Invocations - Rendering Novel Results */}
                {m.toolInvocations?.map((toolInvocation) => {
                  const { toolCallId, state } = toolInvocation;

                  if (state === 'result') {
                    const { result } = toolInvocation;
                    return (
                      <div key={toolCallId} className="mt-4 grid grid-cols-1 gap-4">
                        {result.map((novel: any) => (
                          <div key={novel.ncode} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-primary/50 transition-colors group">
                            <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{novel.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
                              <span>{novel.writer}</span>
                              <span>•</span>
                              <span className="bg-white/10 px-2 py-0.5 rounded">{novel.genre}</span>
                            </div>
                            <p className="text-sm text-white/80 line-clamp-3 mb-4">{novel.story}</p>
                            <a
                              href={novel.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent transition-colors"
                            >
                              なろうで読む <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div key={toolCallId} className="mt-2 flex items-center gap-2 text-xs opacity-50">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      なろう小説を探しています...
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="glass rounded-2xl px-5 py-3">
              <Loader2 className="w-5 h-5 animate-spin opacity-50" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="relative mt-auto">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="異世界で無双する、チート能力を持った主人公の話が読みたい"
          className="w-full glass bg-white/5 border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary disabled:opacity-30 disabled:cursor-not-allowed rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Send className="text-white w-5 h-5" />
        </button>
      </form>
    </main>
  );
}
