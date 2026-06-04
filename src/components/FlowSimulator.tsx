"use client";

import { useEffect, useRef, useState } from "react";
import type { Node, Edge } from "reactflow";

type Msg = { from: "bot" | "user" | "system"; text: string };

function nextNode(edges: Edge[], fromId: string, handle?: string): string | undefined {
  const edge = edges.find(
    (e) => e.source === fromId && (handle ? e.sourceHandle === handle : !e.sourceHandle || e.sourceHandle === "out")
  );
  return edge?.target;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function FlowSimulator({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [waitNodeId, setWaitNodeId] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  const runToken = useRef(0); // guards against duplicate/stale runs (e.g. StrictMode)

  const byId = (id?: string) => nodes.find((n) => n.id === id);

  function addMsg(m: Msg) {
    setMessages((prev) => {
      const next = [...prev, m];
      messagesRef.current = next;
      return next;
    });
  }

  // Call the real AI (grounded in the knowledge base) for an AI node.
  async function aiReply(instruction: string): Promise<string> {
    setTyping(true);
    const convo = messagesRef.current
      .filter((m) => m.from !== "system")
      .map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
    try {
      const res = await fetch("/api/ai/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: convo, instruction }),
      });
      const d = await res.json();
      setTyping(false);
      if (res.ok && d.reply) return d.reply;
      return `⚠️ ${d.error || "Couldn't generate a reply"} (add an AI key in Settings)`;
    } catch {
      setTyping(false);
      return "⚠️ Couldn't reach the AI service";
    }
  }

  // Walk the graph from `startId`, using `userMsg` for condition checks, until
  // we hit a wait node (pause) or run out of nodes (end). Async so AI nodes can
  // fetch a real reply.
  async function run(startId: string | undefined, userMsg: string, token: number) {
    let id = startId;
    let steps = 0;
    while (id && steps < 40) {
      if (token !== runToken.current) return; // a newer run/restart superseded this one
      steps++;
      const node = byId(id);
      if (!node) break;
      const d = (node.data || {}) as Record<string, string>;

      if (node.type === "wait") {
        setWaitNodeId(id);
        return;
      }
      if (node.type === "condition") {
        const kw = (d.keyword || "").toLowerCase();
        const matched = kw ? userMsg.toLowerCase().includes(kw) : true;
        id = nextNode(edges, id, matched ? "match" : "else");
        continue;
      }
      if (node.type === "send") {
        addMsg({ from: "bot", text: d.message || "(empty message)" });
        await delay(350);
      } else if (node.type === "ai") {
        const reply = await aiReply(d.instruction || "");
        if (token !== runToken.current) return;
        addMsg({ from: "bot", text: reply });
        // An AI node with nothing after it keeps the conversation going:
        // wait for the next message, then reply again.
        const nxt = nextNode(edges, id);
        if (!nxt) {
          setWaitNodeId(id);
          return;
        }
        await delay(200);
        id = nxt;
        continue;
      } else if (node.type === "tag") {
        addMsg({ from: "system", text: `🏷️ Tagged "${d.tag || ""}"` });
      } else if (node.type === "status") {
        addMsg({ from: "system", text: `📌 Status → ${d.status || ""}` });
      }
      id = nextNode(edges, id);
    }
    setWaitNodeId(null);
    setEnded(true);
  }

  function restart() {
    const token = ++runToken.current;
    messagesRef.current = [];
    setMessages([]);
    setEnded(false);
    setWaitNodeId(null);
    setTyping(false);
    const trigger = nodes.find((n) => n.type === "trigger");
    setTimeout(() => run(trigger ? nextNode(edges, trigger.id) : undefined, "", token), 0);
  }

  // Start (and restart whenever the graph structure changes meaningfully).
  useEffect(() => {
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, typing]);

  function sendUser() {
    const text = input.trim();
    if (!text || !waitNodeId) return;
    setInput("");
    addMsg({ from: "user", text });
    const paused = byId(waitNodeId);
    // If paused on an AI node, re-enter it (it replies again). After a wait
    // node, continue to whatever comes next.
    const resumeFrom = paused?.type === "ai" ? waitNodeId : nextNode(edges, waitNodeId);
    setWaitNodeId(null);
    setTimeout(() => run(resumeFrom, text, runToken.current), 150);
  }

  return (
    <div className="flex w-[340px] shrink-0 flex-col border-l border-white/10 bg-surface-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Preview</p>
        <button onClick={restart} className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5">
          ↻ Restart
        </button>
      </div>

      {/* Phone frame */}
      <div className="mx-auto w-[290px] overflow-hidden rounded-[2.2rem] border-4 border-slate-800 bg-black shadow-2xl">
        {/* WhatsApp header */}
        <div className="flex items-center gap-2.5 bg-[#202c33] px-3 py-2.5">
          <div className="h-7 w-7 rounded-full bg-brand-500/30 text-center text-sm leading-7 text-brand-200">B</div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-slate-100">Your Business</p>
            <p className="text-[10px] text-emerald-400">online</p>
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="h-[380px] space-y-1.5 overflow-y-auto bg-[#0b141a] px-2.5 py-3">
          {messages.map((m, i) =>
            m.from === "system" ? (
              <div key={i} className="mx-auto w-fit rounded bg-white/5 px-2 py-0.5 text-center text-[10px] text-slate-400">
                {m.text}
              </div>
            ) : (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-2.5 py-1.5 text-[12px] leading-snug ${
                    m.from === "user" ? "rounded-br-sm bg-[#005c4b] text-white" : "rounded-bl-sm bg-[#202c33] text-slate-100"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            )
          )}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-lg rounded-bl-sm bg-[#202c33] px-3 py-2 text-[12px] text-slate-400">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0.3s]" />
                </span>
              </div>
            </div>
          )}
          {ended && !typing && <div className="mx-auto w-fit pt-1 text-center text-[10px] text-slate-500">— end of flow —</div>}
        </div>

        {/* Input */}
        <div className="flex items-center gap-1.5 bg-[#202c33] px-2 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendUser()}
            placeholder={waitNodeId ? "Type a reply…" : ended ? "Flow ended — restart" : "Bot is responding…"}
            disabled={!waitNodeId}
            className="flex-1 rounded-full bg-[#2a3942] px-3 py-1.5 text-[12px] text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-60"
          />
          <button
            onClick={sendUser}
            disabled={!waitNodeId || !input.trim()}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#005c4b] text-white disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-slate-500">
        Type as the customer to test each branch. AI nodes show a placeholder here.
      </p>
    </div>
  );
}
