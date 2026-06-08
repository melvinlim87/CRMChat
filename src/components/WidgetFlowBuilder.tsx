"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  NodeResizer,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

// The widget object (all fields — we send them all back on save so nothing resets).
export type FlowWidget = Record<string, unknown> & {
  key: string;
  flowEnabled: boolean;
  flow: { nodes?: Node[]; edges?: Edge[] } | null;
};

const NODE_DEFAULTS: Record<string, Record<string, unknown>> = {
  message: { text: "Hi! 👋 How can we help you today?" },
  choice: { text: "What can I help with?", options: ["Pricing", "Get started"] },
  ai: { instruction: "" },
  collect: { text: "Sure — what's your name and email?" },
  handoff: { text: "No problem, I'll connect you with a human. 🙌" },
  link: { text: "Here's the link you need:", label: "Open", url: "https://" },
};

const PALETTE = [
  { type: "message", label: "Message" },
  { type: "choice", label: "Buttons" },
  { type: "ai", label: "AI answer" },
  { type: "collect", label: "Collect info" },
  { type: "link", label: "Link button" },
  { type: "handoff", label: "Talk to human" },
];

function Inner({ widget }: { widget: FlowWidget }) {
  const router = useRouter();
  const start: Node = { id: "start", type: "start", position: { x: 80, y: 40 }, data: {}, deletable: false };
  const initialNodes = (widget.flow?.nodes?.length ? widget.flow.nodes : [start]).map((n) =>
    n.type === "start" ? { ...n, deletable: false } : n
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(widget.flow?.edges ?? []);
  const [enabled, setEnabled] = useState(widget.flowEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)), [setEdges]);

  function addNode(type: string) {
    const id = crypto.randomUUID();
    setNodes((nds) => [
      ...nds,
      { id, type, position: { x: 140 + Math.random() * 240, y: 200 + Math.random() * 200 }, data: { ...(NODE_DEFAULTS[type] ?? {}) } },
    ]);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const flow = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
    };
    // Send the whole widget back so other settings aren't reset.
    const res = await fetch("/api/settings/widget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...widget, flow, flowEnabled: enabled }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-surface-panel px-6 py-3">
        <Link href="/chat-widget" className="text-sm text-slate-500 hover:text-slate-200">← Chat Widget</Link>
        <span className="text-sm font-medium text-slate-200">Flow · {String(widget.name ?? widget.key)}</span>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-brand-500" />
          Run this flow when the chat opens
        </label>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {PALETTE.map((p) => (
            <button key={p.type} onClick={() => addNode(p.type)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5">
              + {p.label}
            </button>
          ))}
          {saved && <span className="text-sm font-medium text-emerald-400">Saved ✓</span>}
          <button onClick={save} disabled={saving} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 bg-white/5">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1c2333" gap={20} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <p className="border-t border-white/10 bg-surface-panel px-6 py-2 text-xs text-slate-500">
        Tip: drag from a node&apos;s bottom dot to another node to connect them. “Buttons” has one dot per option — wire each to where it should go. End a branch with an “AI answer” node to hand off to the AI.
      </p>
    </div>
  );
}

/* --------------------------------- Nodes ---------------------------------- */

function useUpdate(id: string) {
  const { setNodes } = useReactFlow();
  return (patch: Record<string, unknown>) =>
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
}

const card = "flex h-full w-full flex-col rounded-xl border bg-surface-panel px-3 py-2.5 shadow-sm";
const inputCls = "nodrag mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-brand-500";

function Resizer({ visible }: { visible?: boolean }) {
  return <NodeResizer isVisible={visible} minWidth={220} minHeight={90} lineClassName="!border-brand-400" handleClassName="!h-2.5 !w-2.5 !rounded-sm !bg-brand-400 !border-0" />;
}

function StartNode({ selected }: NodeProps) {
  return (
    <div className={`${card} border-emerald-400`} style={{ minWidth: 200 }}>
      <Resizer visible={selected} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Start</p>
      <p className="text-sm font-medium text-slate-100">Chat opens</p>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function MessageNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-sky-300`} style={{ minWidth: 240, minHeight: 120 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-400">Message</p>
      <textarea value={data.text ?? ""} onChange={(e) => update({ text: e.target.value })} placeholder="Message text…" className={`${inputCls} min-h-[64px] flex-1 resize-none`} />
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function ChoiceNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  const options: string[] = Array.isArray(data.options) ? data.options : [];
  return (
    <div className={`${card} border-amber-300`} style={{ minWidth: 250, minHeight: 130 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400">Buttons</p>
      <textarea value={data.text ?? ""} onChange={(e) => update({ text: e.target.value })} placeholder="Prompt text…" className={`${inputCls} min-h-[40px] resize-none`} />
      <div className="mt-2 space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="relative flex items-center gap-1">
            <input
              value={opt}
              onChange={(e) => update({ options: options.map((o, j) => (j === i ? e.target.value : o)) })}
              placeholder={`Option ${i + 1}`}
              className="nodrag w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none focus:border-brand-500"
            />
            <button onClick={() => update({ options: options.filter((_, j) => j !== i) })} className="nodrag text-slate-500 hover:text-red-400">×</button>
            <Handle type="source" position={Position.Right} id={`opt-${i}`} style={{ top: "50%" }} />
          </div>
        ))}
        <button onClick={() => update({ options: [...options, ""] })} className="nodrag text-xs font-medium text-brand-300 hover:text-brand-200">+ Add option</button>
      </div>
    </div>
  );
}

function AINode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-violet-300`} style={{ minWidth: 240, minHeight: 110 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">✨ AI answer</p>
      <p className="mt-0.5 text-[11px] text-slate-400">Hands the chat to the AI (knowledge-base answers).</p>
      <textarea value={data.instruction ?? ""} onChange={(e) => update({ instruction: e.target.value })} placeholder="Optional extra instruction…" className={`${inputCls} min-h-[44px] flex-1 resize-none`} />
    </div>
  );
}

function CollectNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-teal-300`} style={{ minWidth: 240, minHeight: 110 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-teal-400">Collect name &amp; email</p>
      <textarea value={data.text ?? ""} onChange={(e) => update({ text: e.target.value })} placeholder="Prompt text…" className={`${inputCls} min-h-[44px] flex-1 resize-none`} />
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function LinkNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-blue-300`} style={{ minWidth: 240, minHeight: 130 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400">Link button</p>
      <textarea value={data.text ?? ""} onChange={(e) => update({ text: e.target.value })} placeholder="Message text…" className={`${inputCls} min-h-[36px] resize-none`} />
      <input value={data.label ?? ""} onChange={(e) => update({ label: e.target.value })} placeholder="Button label" className={inputCls} />
      <input value={data.url ?? ""} onChange={(e) => update({ url: e.target.value })} placeholder="https://…" className={inputCls} />
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function HandoffNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-pink-300`} style={{ minWidth: 240, minHeight: 100 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-pink-400">🙋 Talk to a human</p>
      <textarea value={data.text ?? ""} onChange={(e) => update({ text: e.target.value })} placeholder="Reassurance message…" className={`${inputCls} min-h-[44px] flex-1 resize-none`} />
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  choice: ChoiceNode,
  ai: AINode,
  collect: CollectNode,
  link: LinkNode,
  handoff: HandoffNode,
};

export default function WidgetFlowBuilder({ widget }: { widget: FlowWidget }) {
  return (
    <ReactFlowProvider>
      <Inner widget={widget} />
    </ReactFlowProvider>
  );
}
