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
import FlowSimulator from "./FlowSimulator";

export type FlowData = {
  id: string;
  name: string;
  enabled: boolean;
  keyword: string | null;
  graph: { nodes?: Node[]; edges?: Edge[] } | null;
};

const NODE_DEFAULTS: Record<string, Record<string, unknown>> = {
  send: { message: "" },
  ai: { instruction: "" },
  condition: { keyword: "" },
  tag: { tag: "" },
  status: { status: "CONTACTED" },
};

const PALETTE = [
  { type: "send", label: "Send message" },
  { type: "ai", label: "AI reply" },
  { type: "wait", label: "Wait for reply" },
  { type: "condition", label: "Condition" },
  { type: "tag", label: "Add tag" },
  { type: "status", label: "Set status" },
];

function FlowEditorInner({ flow }: { flow: FlowData }) {
  const router = useRouter();
  const initialNodes = (flow.graph?.nodes ?? []).map((n) =>
    n.type === "trigger" ? { ...n, deletable: false } : n
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.graph?.edges ?? []);
  const [name, setName] = useState(flow.name);
  const [keyword, setKeyword] = useState(flow.keyword ?? "");
  const [enabled, setEnabled] = useState(flow.enabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)),
    [setEdges]
  );

  function addNode(type: string) {
    const id = crypto.randomUUID();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type,
        position: { x: 140 + Math.random() * 220, y: 180 + Math.random() * 180 },
        data: { ...(NODE_DEFAULTS[type] ?? {}) },
      },
    ]);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const graph = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      })),
    };
    const res = await fetch(`/api/flows/${flow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, keyword, enabled, graph }),
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
        <Link href="/flows" className="text-sm text-slate-500 hover:text-slate-200">
          ← Flows
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium outline-none focus:border-brand-500"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Trigger keyword</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="any message"
            className="w-32 rounded-lg border border-white/10 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-brand-500" />
          Enabled
        </label>

        <div className="ml-auto flex items-center gap-2">
          {PALETTE.map((p) => (
            <button
              key={p.type}
              onClick={() => addNode(p.type)}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5"
            >
              + {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowPreview((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${showPreview ? "border-brand-500/50 bg-brand-500/15 text-brand-300" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
          >
            📱 Preview
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="h-full flex-1 bg-white/5">
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
        {showPreview && <FlowSimulator nodes={nodes} edges={edges} />}
      </div>
    </div>
  );
}

/* --------------------------------- Nodes ---------------------------------- */

function useUpdate(id: string) {
  const { setNodes } = useReactFlow();
  return (patch: Record<string, unknown>) =>
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
}

// Cards fill their node box so they grow when resized. min sizes keep them
// readable before any resize.
const card =
  "flex h-full w-full flex-col rounded-xl border bg-surface-panel px-3 py-2.5 shadow-sm";
const inputCls = "nodrag mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-brand-500";

function Resizer({ visible }: { visible?: boolean }) {
  return <NodeResizer isVisible={visible} minWidth={220} minHeight={90} lineClassName="!border-brand-400" handleClassName="!h-2.5 !w-2.5 !rounded-sm !bg-brand-400 !border-0" />;
}

function TriggerNode({ selected }: NodeProps) {
  return (
    <div className={`${card} border-emerald-400`} style={{ minWidth: 220 }}>
      <Resizer visible={selected} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Trigger</p>
      <p className="text-sm font-medium text-slate-100">WhatsApp message received</p>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function SendNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-sky-300`} style={{ minWidth: 240, minHeight: 130 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-400">Send message</p>
      <textarea
        value={data.message ?? ""}
        onChange={(e) => update({ message: e.target.value })}
        placeholder="Message text…"
        className={`${inputCls} min-h-[70px] flex-1 resize-none`}
      />
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function AINode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-violet-300`} style={{ minWidth: 240, minHeight: 130 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">✨ AI reply</p>
      <textarea
        value={data.instruction ?? ""}
        onChange={(e) => update({ instruction: e.target.value })}
        placeholder="Optional instruction (e.g. answer pricing questions)"
        className={`${inputCls} min-h-[70px] flex-1 resize-none`}
      />
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function WaitNode({ selected }: NodeProps) {
  return (
    <div className={`${card} border-teal-300`} style={{ minWidth: 220 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-teal-400">⏸ Wait for reply</p>
      <p className="mt-0.5 text-xs text-slate-400">Pause until the customer responds, then continue.</p>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function ConditionNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-amber-300`} style={{ minWidth: 220 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400">Condition</p>
      <input
        value={data.keyword ?? ""}
        onChange={(e) => update({ keyword: e.target.value })}
        placeholder="message contains…"
        className={inputCls}
      />
      <div className="mt-2 flex justify-between px-1 text-[10px] font-medium text-slate-500">
        <span>match ↙</span>
        <span>↘ else</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="match" style={{ left: "25%" }} />
      <Handle type="source" position={Position.Bottom} id="else" style={{ left: "75%" }} />
    </div>
  );
}

function TagNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-pink-300`} style={{ minWidth: 220 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-pink-400">Add tag</p>
      <input value={data.tag ?? ""} onChange={(e) => update({ tag: e.target.value })} placeholder="tag name" className={inputCls} />
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

function StatusNode({ id, data, selected }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-white/15`} style={{ minWidth: 220 }}>
      <Resizer visible={selected} />
      <Handle type="target" position={Position.Top} />
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Set status</p>
      <select value={data.status ?? "CONTACTED"} onChange={(e) => update({ status: e.target.value })} className={inputCls}>
        {["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  send: SendNode,
  ai: AINode,
  wait: WaitNode,
  condition: ConditionNode,
  tag: TagNode,
  status: StatusNode,
};

export default function FlowEditor({ flow }: { flow: FlowData }) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner flow={flow} />
    </ReactFlowProvider>
  );
}
