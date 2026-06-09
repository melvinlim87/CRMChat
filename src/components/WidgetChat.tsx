"use client";

import { useEffect, useRef, useState, Fragment } from "react";

type Msg = { from: "bot" | "user" | "agent" | "system"; text: string };
type FNode = { id: string; type: string; data: Record<string, any> };
type FEdge = { source: string; target: string; sourceHandle?: string | null };
type WConfig = {
  key?: string; title: string; welcome: string; color: string; starters?: string[]; avatar?: string | null;
  gateHeading?: string; studentLabel?: string; visitorLabel?: string;
  studentColor?: string | null; visitorColor?: string | null;
  flowEnabled?: boolean; flow?: { nodes?: FNode[]; edges?: FEdge[] };
};
type FlowBtn = { label: string; target?: string; url?: string };
type View = "gate" | "studentAuth" | "chat";
type Theme = "light" | "dark";

export default function WidgetChat({
  config,
  widgetKey = "public",
  studentConfig,
  gate = false,
  theme = "light",
}: {
  config: WConfig;
  widgetKey?: string;
  studentConfig?: WConfig;
  gate?: boolean;
  theme?: Theme;
}) {
  const [view, setView] = useState<View>(gate && studentConfig ? "gate" : "chat");
  const [active, setActive] = useState<WConfig>(config);
  const [activeKey, setActiveKey] = useState<string>(widgetKey);
  const [studentEmail, setStudentEmail] = useState("");

  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: config.welcome }]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const [emailInput, setEmailInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState("");

  // Live human-takeover state.
  const [humanMode, setHumanMode] = useState(false);
  const humanModeRef = useRef(false);
  const lastPollRef = useRef<string>(new Date(0).toISOString());
  function setHuman(v: boolean) {
    humanModeRef.current = v;
    setHumanMode(v);
  }
  function pushSystem(text: string) {
    setMessages((m) => (m[m.length - 1]?.text === text ? m : [...m, { from: "system", text }]));
  }

  // Visual flow runtime state.
  const [flowActive, setFlowActive] = useState(false);
  const [flowButtons, setFlowButtons] = useState<FlowBtn[]>([]);
  const [flowCollect, setFlowCollect] = useState<{ next?: string } | null>(null);
  const [collectName, setCollectName] = useState("");
  const [collectEmail, setCollectEmail] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const sidRef = useRef("");
  const flowStartedRef = useRef(false);
  const choiceKey = `crmchat_widget_choice_${widgetKey}`;
  const dark = theme === "dark";

  // Always show the gate first when gating is on; pre-fill returning student email.
  useEffect(() => {
    if (!gate || !studentConfig) {
      enterChat(config, widgetKey);
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(choiceKey) || "null");
      if (saved?.email) setEmailInput(saved.email);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once in a chat, set up the session for the active widget and load history.
  useEffect(() => {
    if (view !== "chat") return;
    const storeKey = `crmchat_widget_session_${activeKey}`;
    let sid = localStorage.getItem(storeKey);
    if (!sid) {
      sid = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random()}`;
      localStorage.setItem(storeKey, sid);
    }
    setSessionId(sid);
    sidRef.current = sid;
    fetch(`/api/widget/chat?sessionId=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.humanTakeover) setHuman(true);
        if (Array.isArray(d.messages) && d.messages.length) {
          setMessages(d.messages.map((m: any) => ({ from: m.from, text: m.text }))); // returning visitor — keep history
          const last = d.messages[d.messages.length - 1]?.createdAt;
          if (last) lastPollRef.current = last;
        } else if (!flowStartedRef.current && active.flowEnabled && (active.flow?.nodes?.length ?? 0) > 0) {
          flowStartedRef.current = true;
          startFlow();
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeKey]);

  // Poll for live agent replies (human takeover) while the chat is open.
  useEffect(() => {
    if (view !== "chat" || !sessionId) return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/widget/poll?sessionId=${encodeURIComponent(sessionId)}&after=${encodeURIComponent(lastPollRef.current)}`);
        const d = await r.json();
        if (d.humanTakeover && !humanModeRef.current) {
          setHuman(true);
          pushSystem("Connecting you with our team… 👤");
        } else if (!d.humanTakeover && humanModeRef.current) {
          setHuman(false);
          pushSystem("You're back with the AI assistant 🤖");
        }
        if (Array.isArray(d.messages) && d.messages.length) {
          setMessages((m) => [...m, ...d.messages.map((x: any) => ({ from: "agent" as const, text: x.text }))]);
          lastPollRef.current = d.messages[d.messages.length - 1].createdAt;
        }
      } catch {}
    };
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, [view, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending, suggestions, view]);

  function enterChat(cfg: WConfig, key: string, name?: string) {
    setActive(cfg);
    setActiveKey(key);
    flowStartedRef.current = false;
    endFlow();
    const welcome = name ? `Welcome back, ${name}! 👋 ${cfg.welcome}` : cfg.welcome;
    setMessages([{ from: "bot", text: welcome }]);
    setSuggestions([]);
    setView("chat");
  }

  function chooseVisitor() {
    localStorage.setItem(choiceKey, JSON.stringify({ mode: "public" }));
    setStudentEmail("");
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

  function newChat() {
    localStorage.removeItem(`crmchat_widget_session_${activeKey}`);
    const sid = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random()}`;
    localStorage.setItem(`crmchat_widget_session_${activeKey}`, sid);
    setSessionId(sid);
    sidRef.current = sid;
    lastPollRef.current = new Date().toISOString();
    setHuman(false);
    setSuggestions([]);
    endFlow();
    if (active.flowEnabled && (active.flow?.nodes?.length ?? 0) > 0) {
      flowStartedRef.current = true;
      startFlow();
    } else {
      setMessages([{ from: "bot", text: active.welcome }]);
    }
  }

  /* ----------------------------- Flow runtime ----------------------------- */
  function flowGraph() {
    return { nodes: active.flow?.nodes ?? [], edges: active.flow?.edges ?? [] };
  }
  function fnode(id?: string) {
    return id ? flowGraph().nodes.find((n) => n.id === id) : undefined;
  }
  function ftarget(id: string, handle?: string) {
    const e = flowGraph().edges.find((x) => x.source === id && (handle ? (x.sourceHandle || "") === handle : true));
    return e?.target;
  }
  function logMsg(direction: "INBOUND" | "OUTBOUND", body: string, extra?: Record<string, unknown>) {
    if (!sidRef.current) return;
    fetch("/api/widget/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sidRef.current, widget: activeKey, direction, body, ...extra }),
    }).catch(() => {});
  }
  function botSay(text: string) {
    if (!text) return;
    setMessages((m) => [...m, { from: "bot", text }]);
    logMsg("OUTBOUND", text);
  }
  function endFlow() {
    setFlowActive(false);
    setFlowButtons([]);
    setFlowCollect(null);
  }
  function startFlow() {
    const { nodes } = flowGraph();
    const startNode = nodes.find((n) => n.type === "start") ?? nodes[0];
    if (!startNode) return;
    setMessages([]);
    setFlowActive(true);
    const first = startNode.type === "start" ? ftarget(startNode.id, "out") : startNode.id;
    stepFlow(first);
  }
  function stepFlow(nodeId?: string) {
    const node = fnode(nodeId);
    if (!node) return endFlow();
    switch (node.type) {
      case "message": {
        botSay(node.data?.text || "");
        const next = ftarget(node.id, "out");
        if (next) setTimeout(() => stepFlow(next), 650);
        else endFlow();
        break;
      }
      case "choice": {
        if (node.data?.text) botSay(node.data.text);
        const options: string[] = Array.isArray(node.data?.options) ? node.data.options : [];
        setFlowButtons(
          options
            .map((label, i) => ({ label: String(label).trim(), target: ftarget(node.id, `opt-${i}`) }))
            .filter((b) => b.label)
        );
        break;
      }
      case "collect": {
        if (node.data?.text) botSay(node.data.text);
        setFlowCollect({ next: ftarget(node.id, "out") });
        break;
      }
      case "link": {
        if (node.data?.text) botSay(node.data.text);
        setFlowButtons([{ label: node.data?.label || "Open", url: node.data?.url || "#", target: ftarget(node.id, "out") }]);
        break;
      }
      case "handoff": {
        botSay(node.data?.text || "No problem — I'll connect you with our team. 🙌");
        logMsg("OUTBOUND", "", { needsHuman: true });
        endFlow();
        break;
      }
      case "ai":
      default:
        endFlow(); // hand off to the AI: free typing now answers from the KB
    }
  }
  function onFlowButton(btn: FlowBtn) {
    setFlowButtons([]);
    if (btn.url) {
      window.open(btn.url, "_blank", "noopener,noreferrer");
    } else {
      setMessages((m) => [...m, { from: "user", text: btn.label }]);
      logMsg("INBOUND", btn.label);
    }
    if (btn.target) setTimeout(() => stepFlow(btn.target), 400);
    else endFlow();
  }
  function submitCollect() {
    const name = collectName.trim();
    const email = collectEmail.trim();
    if (!name && !email) return;
    const summary = [name, email].filter(Boolean).join(" · ");
    setMessages((m) => [...m, { from: "user", text: summary }]);
    logMsg("INBOUND", summary, { name, email });
    if (email) setStudentEmail(email);
    const next = flowCollect?.next;
    setFlowCollect(null);
    setCollectName("");
    setCollectEmail("");
    if (next) setTimeout(() => stepFlow(next), 400);
    else endFlow();
  }

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || sending || !sessionId) return;
    setInput("");
    setSuggestions([]);
    if (flowActive || flowButtons.length || flowCollect) endFlow(); // typing exits the scripted flow
    setMessages((m) => [...m, { from: "user", text }]);
    setSending(true);
    try {
      const res = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, widget: activeKey, email: studentEmail || undefined }),
      });
      const d = await res.json();
      if (d.humanTakeover && !humanModeRef.current) {
        setHuman(true);
        pushSystem("Connecting you with our team… 👤");
      }
      // During human takeover the AI stays silent — the agent's reply arrives via polling.
      if (d.humanTakeover && (!Array.isArray(d.replies) || d.replies.length === 0)) {
        return;
      }
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

  // Theme tokens.
  const ui = {
    panel: dark ? "bg-[#0c0d11]" : "bg-white",
    body: dark ? "bg-[#0c0d11]" : "bg-slate-50",
    botBubble: dark ? "border border-white/10 bg-white/[0.06] text-slate-100" : "bg-white text-slate-800",
    typing: dark ? "border border-white/10 bg-white/[0.06]" : "bg-white",
    footer: dark ? "border-white/10 bg-[#0c0d11]" : "border-slate-200 bg-white",
    input: dark
      ? "border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus:border-white/25"
      : "border-slate-200 bg-slate-50 text-slate-800 focus:border-slate-400",
    title: dark ? "text-slate-100" : "text-slate-800",
    sub: dark ? "text-slate-400" : "text-slate-500",
    outline: dark
      ? "border-white/15 bg-white/5 text-slate-100 hover:bg-white/10"
      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
  };

  // Starter prompts shown when a fresh chat opens — use the ones configured for
  // this widget, falling back to sensible defaults.
  const isStudent = Boolean(studentEmail);
  const configured = (active.starters ?? []).map((s) => s.trim()).filter(Boolean);
  const starters =
    configured.length
      ? configured
      : isStudent
      ? ["Help with my account", "Where are my course materials?", "Payment & billing"]
      : ["What do you offer?", "How do I get started?", "Pricing & plans"];

  const headerColor = view === "studentAuth" ? studentConfig?.color || config.color : active.color;
  const headerTitle = view === "gate" ? config.title : view === "studentAuth" ? studentConfig?.title || "Student login" : active.title;

  // ---- Gate -------------------------------------------------------------------
  if (view === "gate") {
    return (
      <div className={`flex h-full flex-col ${ui.panel}`}>
        <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: config.color }}>
          {config.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white/30" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm">💬</span>
          )}
          <p className="font-semibold">{config.title}</p>
        </header>
        <div className={`flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center ${ui.body}`}>
          <div className="text-3xl">👋</div>
          <p className={`text-base font-semibold ${ui.title}`}>{config.gateHeading || "Welcome! How can we help?"}</p>
          <p className={`-mt-2 text-sm ${ui.sub}`}>Students sign in for personalised help with their course.</p>
          <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
            <button
              onClick={() => setView("studentAuth")}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: config.studentColor || studentConfig?.color || config.color }}
            >
              {config.studentLabel || "🎓 Existing Student"}
            </button>
            {config.visitorColor ? (
              <button
                onClick={chooseVisitor}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: config.visitorColor }}
              >
                {config.visitorLabel || "💬 General Enquiry"}
              </button>
            ) : (
              <button onClick={chooseVisitor} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${ui.outline}`}>
                {config.visitorLabel || "💬 General Enquiry"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Student login ----------------------------------------------------------
  if (view === "studentAuth") {
    return (
      <div className={`flex h-full flex-col ${ui.panel}`}>
        <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: headerColor }}>
          <button onClick={() => setView("gate")} className="text-lg leading-none" aria-label="Back">‹</button>
          <p className="font-semibold">{headerTitle}</p>
        </header>
        <div className={`flex flex-1 flex-col justify-center gap-3 px-6 ${ui.body}`}>
          <div className="text-center">
            <div className="text-3xl">🎓</div>
            <p className={`mt-2 text-base font-semibold ${ui.title}`}>Student sign in</p>
            <p className={`text-sm ${ui.sub}`}>Enter the email on your student account to continue.</p>
          </div>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verifyStudent()}
            placeholder="you@example.com"
            className={`rounded-xl border px-4 py-2.5 text-sm outline-none ${ui.input}`}
          />
          {authError && (
            <p className="text-xs text-red-400">
              {authError}{" "}
              <button onClick={chooseVisitor} className="font-semibold underline">
                Continue as general enquiry
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
  const showStarters = !sending && !humanMode && !flowActive && !flowButtons.length && !flowCollect && messages.length <= 1 && suggestions.length === 0;
  return (
    <div className={`flex h-full flex-col ${ui.panel}`}>
      <header className="flex items-center gap-2 px-4 py-3 text-white" style={{ backgroundColor: active.color }}>
        {active.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.avatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/30" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-sm">🤖</span>
        )}
        <div className="flex-1 leading-tight">
          <p className="font-semibold">{active.title}</p>
          <p className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            {humanMode ? "Connected to our team" : "AI assistant · replies instantly"}
          </p>
        </div>
        <button onClick={newChat} title="New chat" className="rounded-md px-1.5 py-1 text-sm text-white/80 transition hover:bg-white/15 hover:text-white">
          ↻
        </button>
        {gate && studentConfig && (
          <button onClick={switchMode} className="rounded-md px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/15 hover:text-white" title="Switch">
            Switch
          </button>
        )}
      </header>

      <div ref={scrollRef} className={`flex-1 space-y-2 overflow-y-auto px-3 py-4 ${ui.body}`}>
        {messages.map((m, i) =>
          m.from === "system" ? (
            <div key={i} className="flex justify-center py-1">
              <span className={`rounded-full px-3 py-1 text-[11px] ${dark ? "bg-white/10 text-slate-300" : "bg-slate-200 text-slate-600"}`}>{m.text}</span>
            </div>
          ) : (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[82%]">
                {m.from === "agent" && (
                  <p className="mb-0.5 flex items-center gap-1 px-1 text-[10px] font-semibold" style={{ color: active.color }}>
                    <span>👤</span> Our team
                  </p>
                )}
                <div
                  className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.from === "user" ? "rounded-br-sm text-white" : `rounded-bl-sm ${ui.botBubble}`
                  } ${m.from === "agent" ? "ring-1 ring-inset" : ""}`}
                  style={
                    m.from === "user"
                      ? { backgroundColor: active.color }
                      : m.from === "agent"
                      ? ({ ["--tw-ring-color" as any]: active.color } as any)
                      : undefined
                  }
                >
                  {linkify(m.text, m.from === "user")}
                </div>
              </div>
            </div>
          )
        )}

        {sending && (
          <div className="flex justify-start">
            <div className={`flex items-center gap-1 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm ${ui.typing}`}>
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        )}

        {showStarters && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${ui.outline}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Flow buttons (choice / link nodes) */}
        {flowButtons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {flowButtons.map((b, i) => (
              <button
                key={i}
                onClick={() => onFlowButton(b)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
                style={{ backgroundColor: active.color }}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}

        {/* Flow collect-info form */}
        {flowCollect && (
          <div className="space-y-1.5 pt-1">
            <input
              value={collectName}
              onChange={(e) => setCollectName(e.target.value)}
              placeholder="Your name"
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${ui.input}`}
            />
            <input
              type="email"
              value={collectEmail}
              onChange={(e) => setCollectEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCollect()}
              placeholder="Email"
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${ui.input}`}
            />
            <button
              onClick={submitCollect}
              disabled={!collectName.trim() && !collectEmail.trim()}
              className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: active.color }}
            >
              Send
            </button>
          </div>
        )}

        {!sending && suggestions.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5 pt-1">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
                style={{ borderColor: active.color, color: active.color }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`flex items-center gap-2 border-t px-3 py-2.5 ${ui.footer}`}>
        <button
          onClick={() => send("I'd like to talk to a human please")}
          disabled={sending}
          title="Talk to a human"
          className={`flex h-9 shrink-0 items-center justify-center rounded-full border px-3 text-xs font-medium transition disabled:opacity-50 ${ui.outline}`}
        >
          🧑‍💼
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type your message…"
          className={`flex-1 rounded-full border px-4 py-2 text-sm outline-none ${ui.input}`}
        />
        <button
          onClick={() => send()}
          disabled={sending || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ backgroundColor: active.color }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

// Render plain text with clickable links (and email addresses).
function linkify(text: string, onAccent: boolean) {
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g);
  const cls = onAccent ? "underline" : "underline";
  return parts.map((p, i) => {
    if (/^(https?:\/\/|www\.)/.test(p)) {
      const href = p.startsWith("http") ? p : `https://${p}`;
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {p}
        </a>
      );
    }
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(p)) {
      return (
        <a key={i} href={`mailto:${p}`} className={cls}>
          {p}
        </a>
      );
    }
    return <Fragment key={i}>{p}</Fragment>;
  });
}
