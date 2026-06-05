"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "bot" | "user"; text: string };

export default function WidgetChat({
  config,
  widgetKey = "public",
}: {
  config: { title: string; welcome: string; color: string };
  widgetKey?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: config.welcome }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storeKey = `crmchat_widget_session_${widgetKey}`;
    let sid = localStorage.getItem(storeKey);
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random()}`);
      localStorage.setItem(storeKey, sid);
    }
    setSessionId(sid);
  }, [widgetKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !sessionId) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text }]);
    setSending(true);
    try {
      const res = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, widget: widgetKey }),
      });
      const d = await res.json();
      setMessages((m) => [...m, { from: "bot", text: d.reply || "Thanks! We'll be in touch." }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: config.color }}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm">💬</span>
        <p className="font-semibold">{config.title}</p>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                m.from === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm bg-white text-slate-800"
              }`}
              style={m.from === "user" ? { backgroundColor: config.color } : undefined}
            >
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm text-slate-400 shadow-sm">…</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type your message…"
          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ backgroundColor: config.color }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
