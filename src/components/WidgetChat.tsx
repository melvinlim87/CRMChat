"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "bot" | "user"; text: string };
type WConfig = { key?: string; title: string; welcome: string; color: string };
type View = "gate" | "studentAuth" | "chat";

export default function WidgetChat({
  config,
  widgetKey = "public",
  studentConfig,
  gate = false,
}: {
  config: WConfig;
  widgetKey?: string;
  studentConfig?: WConfig;
  gate?: boolean;
}) {
  // Which experience we're in. When `gate` is on we ask first; otherwise we go
  // straight to chat using `config`.
  const [view, setView] = useState<View>(gate && studentConfig ? "gate" : "chat");
  const [active, setActive] = useState<WConfig>(config);
  const [activeKey, setActiveKey] = useState<string>(widgetKey);
  const [studentEmail, setStudentEmail] = useState("");

  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: config.welcome }]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");

  // Student auth form state.
  const [emailInput, setEmailInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const choiceKey = `crmchat_widget_choice_${widgetKey}`;

  // Restore a previous choice (visitor vs verified student) so the gate doesn't
  // reappear on every reload.
  useEffect(() => {
    if (!gate || !studentConfig) {
      enterChat(config, widgetKey);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(choiceKey) || "null");
      if (saved?.mode === "student" && saved.email) {
        setStudentEmail(saved.email);
        enterChat(studentConfig, studentConfig.key || "students", saved.name);
      } else if (saved?.mode === "public") {
        enterChat(config, config.key || "public");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once we're in a chat, set up the session for the active widget and load history.
  useEffect(() => {
    if (view !== "chat") return;
    const storeKey = `crmchat_widget_session_${activeKey}`;
    let sid = localStorage.getItem(storeKey);
    if (!sid) {
      sid = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random()}`;
      localStorage.setItem(storeKey, sid);
    }
    setSessionId(sid);
    fetch(`/api/widget/chat?sessionId=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.messages) && d.messages.length) setMessages(d.messages);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending, suggestions, view]);

  function enterChat(cfg: WConfig, key: string, name?: string) {
    setActive(cfg);
    setActiveKey(key);
    const welcome = name ? `Welcome back, ${name}! 👋 ${cfg.welcome}` : cfg.welcome;
    setMessages([{ from: "bot", text: welcome }]);
    setView("chat");
  }

  function chooseVisitor() {
    localStorage.setItem(choiceKey, JSON.stringify({ mode: "public" }));
    enterChat(config, config.key || "public");
  }

  async function verifyStudent() {
    const email = emailInput.trim();
    if (!email || verifying) return;
    setVerifying(true);
    setAuthError("");
    try {
      const res = await fetch("/api/widget/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await res.json();
      if (d.ok) {
        setStudentEmail(email);
        localStorage.setItem(choiceKey, JSON.stringify({ mode: "student", email, name: d.name }));
        enterChat(studentConfig!, studentConfig!.key || "students", d.name);
      } else {
        setAuthError(d.error || "We couldn't find a student account for that email.");
      }
    } catch {
      setAuthError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  function switchMode() {
    localStorage.removeItem(choiceKey);
    setView("gate");
    setEmailInput("");
    setAuthError("");
  }

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
        body: JSON.stringify({ sessionId, message: text, widget: activeKey, email: studentEmail || undefined }),
      });
      const d = await res.json();
      const replies: string[] = Array.isArray(d.replies) && d.replies.length
        ? d.replies
        : [d.reply || "Thanks! We'll be in touch."];
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

  function typingDelay(text: string) {
    return Math.min(1600, 500 + text.length * 18);
  }

  const headerColor = view === "studentAuth" ? studentConfig?.color || config.color : active.color;
  const headerTitle = view === "gate" ? config.title : view === "studentAuth" ? studentConfig?.title || "Student login" : active.title;

  // ---- Gate: ask who they are -------------------------------------------------
  if (view === "gate") {
    return (
      <div className="flex h-full flex-col bg-white">
        <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: config.color }}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm">💬</span>
          <p className="font-semibold">{config.title}</p>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
          <div className="text-3xl">👋</div>
          <p className="text-base font-semibold text-slate-800">Welcome! Are you a student?</p>
          <p className="-mt-2 text-sm text-slate-500">Students sign in for personalised help with their course.</p>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <button
              onClick={() => setView("studentAuth")}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: studentConfig?.color || config.color }}
            >
              🎓 I&apos;m a student
            </button>
            <button
              onClick={chooseVisitor}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              I&apos;m just browsing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Student login (email match) -------------------------------------------
  if (view === "studentAuth") {
    return (
      <div className="flex h-full flex-col bg-white">
        <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: headerColor }}>
          <button onClick={() => setView("gate")} className="text-lg leading-none" aria-label="Back">‹</button>
          <p className="font-semibold">{headerTitle}</p>
        </header>
        <div className="flex flex-1 flex-col justify-center gap-3 bg-slate-50 px-6">
          <div className="text-center">
            <div className="text-3xl">🎓</div>
            <p className="mt-2 text-base font-semibold text-slate-800">Student sign in</p>
            <p className="text-sm text-slate-500">Enter the email on your student account to continue.</p>
          </div>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verifyStudent()}
            placeholder="you@example.com"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500"
          />
          {authError && (
            <p className="text-xs text-red-500">
              {authError}{" "}
              <button onClick={chooseVisitor} className="font-semibold underline">
                Chat as a visitor instead
              </button>
            </p>
          )}
          <button
            onClick={verifyStudent}
            disabled={verifying || !emailInput.trim()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: studentConfig?.color || config.color }}
          >
            {verifying ? "Checking…" : "Continue"}
          </button>
        </div>
      </div>
    );
  }

  // ---- Chat -------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: active.color }}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm">💬</span>
        <div className="flex-1 leading-tight">
          <p className="font-semibold">{active.title}</p>
          <p className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Online
          </p>
        </div>
        {gate && studentConfig && (
          <button onClick={switchMode} className="text-[11px] text-white/80 underline hover:text-white" title="Switch">
            Switch
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                m.from === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm bg-white text-slate-800"
              }`}
              style={m.from === "user" ? { backgroundColor: active.color } : undefined}
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
                style={{ borderColor: active.color, color: active.color }}
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
          style={{ backgroundColor: active.color }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
