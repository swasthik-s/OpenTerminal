"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { apiGet, apiPost, type Quote } from "../../lib/api";
import { useTerminal } from "../../store/terminal";

type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = [
  "Summarize today's market drivers",
  "Build a trend-following strategy for gold",
  "Explain my risk and reward on a 1:2 setup",
  "What should I test before going live?",
];

export default function AiWidget() {
  const activeSymbol = useTerminal((s) => s.activeSymbol);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: async (userText: string) => {
      let context: unknown = null;
      try {
        context = { activeSymbol, quote: (await apiGet<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(activeSymbol)}`))[0] };
      } catch { /* quote context is optional */ }
      const next = [...messages, { role: "user" as const, content: userText }];
      const res = await apiPost<{ text: string }>("/api/ai/chat", { messages: next, context });
      return { next, reply: res.text };
    },
    onSuccess: ({ next, reply }) => {
      setMessages([...next, { role: "assistant", content: reply }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
    },
  });

  const send = (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || chat.isPending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    chat.mutate(text);
  };

  return (
    <div className="ai-chat">
      <div className="ai-chat-topline"><span><i className="ai-pulse" /> MARKET INTELLIGENCE</span><span>CONTEXT: {activeSymbol}</span></div>
      <div ref={scrollRef} className="ai-chat-messages">
        {messages.length === 0 ? (
          <div className="ai-welcome">
            <div className="ai-orb">✳</div>
            <div className="ai-kicker">OPENTERMINAL INTELLIGENCE</div>
            <h2>Your market workspace.<br /><span>Ask it anything.</span></h2>
            <p>Research markets, reason through trade ideas, and draft strategy rules. Connected data and tools will be clearly identified when available.</p>
            <div className="ai-suggestions">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} disabled={chat.isPending}>{s}<span>↗</span></button>)}</div>
          </div>
        ) : (
          <div className="ai-message-list">{messages.map((m, i) => (
            <article className={`ai-message ${m.role}`} key={i}>
              <div className="ai-message-avatar">{m.role === "user" ? "YOU" : "✳"}</div>
              <div className="ai-message-body"><div className="ai-message-label">{m.role === "user" ? "YOU" : "OPENTERMINAL AI"}</div><div className="ai-message-text">{m.content}</div></div>
            </article>
          ))}{chat.isPending && <article className="ai-message assistant"><div className="ai-message-avatar">✳</div><div className="ai-message-body"><div className="ai-message-label">OPENTERMINAL AI</div><div className="ai-thinking"><i/><i/><i/> Thinking through your request…</div></div></article>}{chat.error && <div className="ai-error">{(chat.error as Error).message}</div>}</div>
        )}
      </div>
      <div className="ai-composer-wrap"><div className="ai-composer"><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask about markets, a ticker, or your strategy…" rows={2} /><button onClick={() => send()} disabled={!input.trim() || chat.isPending} aria-label="Send message">↑</button></div><div className="ai-composer-meta"><span>ENTER TO SEND · SHIFT+ENTER FOR NEW LINE</span><span>AI OUTPUT IS NOT A TRADE EXECUTION</span></div></div>
    </div>
  );
}
