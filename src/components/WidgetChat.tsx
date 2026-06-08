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
  const [suggestions, setSuggestions] = useState<string[]>([]);
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

    // Restore prior conversation so the chat survives page reloads.
    fetch(`/api/widget/chat?sessionId=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages) && d.messages.length) setMessages(d.messages);
      })
      .catch(() => {});
  }, [widgetKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending, suggestions]);

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || sending || !sessionId) return;
    setInput("");
    setSuggestions([]);
    setMessages((m) => [...m, { from: "user", text }]);
    setSending(true);
    try {
      const res = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, widget: widgetKey }),
      });
      const d = await res.json();
      const replies: string[] = Array.isArray(d.replies) && d.replies.length
        ? d.replies
        : [d.reply || "Thanks! We'll be in touch."];

      // Drip each bubble in one at a time with a short "typing" pause so the
      // assistant feels like a real person replying across a few messages.
      for (let i = 0; i < replies.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, typingDelay(replies[i])));
        setMessages((m) => [...m, { from: "bot", text: replies[i] }]);
      }
      if (Array.isArray(d.suggestions)) setSuggestions(d.suggestions);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  // Roughly mimic reading/typing time, capped so it never feels sluggish.
  function typingDelay(text: string) {
    return Math.min(1600, 500 + text.length * 18);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: config.color }}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm">💬</span>
        <div className="leading-tight">
          <p className="font-semibold">{config.title}</p>
          <p className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Online
          </p>
        </div>
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
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2.5 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        )}
        {!sending && suggestions.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5 pt-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-slate-100"
                style={{ borderColor: config.color, color: config.color }}
              >
                {s}
              </button>
            ))}
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
          onClick={() => send()}
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
