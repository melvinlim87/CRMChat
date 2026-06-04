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
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

export type AutomationData = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  graph: { nodes?: Node[]; edges?: Edge[] } | null;
};

const NODE_DEFAULTS: Record<string, Record<string, unknown>> = {
  send: { message: "" },
  ai: { instruction: "" },
  tag: { tag: "" },
  status: { status: "CONTACTED" },
  slack: { text: "" },
  http: { method: "POST", url: "", body: "" },
  condition: { keyword: "" },
};

const PALETTE = [
  { type: "send", label: "Send message" },
  { type: "ai", label: "AI reply" },
  { type: "condition", label: "Condition" },
  { type: "tag", label: "Add tag" },
  { type: "status", label: "Set status" },
  { type: "slack", label: "Slack notify" },
  { type: "http", label: "HTTP request" },
];

function Inner({ automation }: { automation: AutomationData }) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState(automation.graph?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(automation.graph?.edges ?? []);
  const [name, setName] = useState(automation.name);
  const [enabled, setEnabled] = useState(automation.enabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)), [setEdges]);

  function addNode(type: string) {
    const id = crypto.randomUUID();
    setNodes((nds) => [...nds, { id, type, position: { x: 360 + Math.random() * 180, y: 80 + Math.random() * 220 }, data: { ...(NODE_DEFAULTS[type] ?? {}) } }]);
  }

  async function save(nextEnabled = enabled) {
    setSaving(true);
    setSaved(false);
    const graph = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
    };
    const triggerNode = nodes.find((n) => n.type === "trigger");
    const trigger = (triggerNode?.data as { event?: string })?.event || automation.trigger;
    const res = await fetch(`/api/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, enabled: nextEnabled, trigger, graph }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      router.refresh();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-surface-panel px-6 py-3">
        <Link href="/automations" className="text-sm text-slate-500 hover:text-slate-200">← Automations</Link>
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-100 outline-none focus:border-brand-500" />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); save(e.target.checked); }} className="accent-brand-500" />
          Enabled
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {PALETTE.map((p) => (
            <button key={p.type} onClick={() => addNode(p.type)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5">
              + {p.label}
            </button>
          ))}
          {saved && <span className="text-sm font-medium text-emerald-400">Saved ✓</span>}
          <button onClick={() => save()} disabled={saving} className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-600 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 bg-white/5">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}>
          <Background color="#1c2333" gap={20} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}

/* --------------------------------- Nodes ---------------------------------- */

function useUpdate(id: string) {
  const { setNodes } = useReactFlow();
  return (patch: Record<string, unknown>) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
}

const card = "w-60 rounded-xl border bg-surface-panel px-3 py-2.5 shadow-sm";
const inputCls = "nodrag mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-brand-500";
const label = "text-[10px] font-bold uppercase tracking-wide";

function TriggerNode({ id, data }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-emerald-400`}>
      <p className={`${label} text-emerald-400`}>⚡ Trigger</p>
      <select value={data.event ?? "MESSAGE_RECEIVED"} onChange={(e) => update({ event: e.target.value })} className={inputCls}>
        <option value="MESSAGE_RECEIVED">Message received</option>
        <option value="LEAD_CREATED">Lead created</option>
        <option value="FORM_SUBMITTED">Form submitted</option>
      </select>
      {data.event !== "LEAD_CREATED" && (
        <input value={data.keyword ?? ""} onChange={(e) => update({ keyword: e.target.value })} placeholder="keyword filter (optional)" className={inputCls} />
      )}
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function SendNode({ id, data }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-sky-300`}>
      <Handle type="target" position={Position.Left} />
      <p className={`${label} text-sky-400`}>Send message</p>
      <textarea rows={3} value={data.message ?? ""} onChange={(e) => update({ message: e.target.value })} placeholder="Message… use {{name}}" className={`${inputCls} resize-none`} />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function AINode({ id, data }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-violet-300`}>
      <Handle type="target" position={Position.Left} />
      <p className={`${label} text-violet-400`}>✨ AI reply</p>
      <textarea rows={3} value={data.instruction ?? ""} onChange={(e) => update({ instruction: e.target.value })} placeholder="Optional instruction" className={`${inputCls} resize-none`} />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function TagNode({ id, data }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-pink-300`}>
      <Handle type="target" position={Position.Left} />
      <p className={`${label} text-pink-400`}>Add tag</p>
      <input value={data.tag ?? ""} onChange={(e) => update({ tag: e.target.value })} placeholder="tag name" className={inputCls} />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function StatusNode({ id, data }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-white/15`}>
      <Handle type="target" position={Position.Left} />
      <p className={`${label} text-slate-400`}>Set status</p>
      <select value={data.status ?? "CONTACTED"} onChange={(e) => update({ status: e.target.value })} className={inputCls}>
        {["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function SlackNode({ id, data }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-indigo-300`}>
      <Handle type="target" position={Position.Left} />
      <p className={`${label} text-indigo-300`}>Slack notify</p>
      <textarea rows={2} value={data.text ?? ""} onChange={(e) => update({ text: e.target.value })} placeholder="Message to Slack… {{name}}" className={`${inputCls} resize-none`} />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function HttpNode({ id, data }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-amber-300`}>
      <Handle type="target" position={Position.Left} />
      <p className={`${label} text-amber-400`}>HTTP request</p>
      <div className="mt-1 flex gap-1">
        <select value={data.method ?? "POST"} onChange={(e) => update({ method: e.target.value })} className="nodrag w-20 rounded-md border border-white/10 bg-white/5 px-1 py-1.5 text-xs text-slate-100 outline-none">
          {["POST", "GET", "PUT"].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={data.url ?? ""} onChange={(e) => update({ url: e.target.value })} placeholder="https://…" className="nodrag flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-100 outline-none" />
      </div>
      <textarea rows={2} value={data.body ?? ""} onChange={(e) => update({ body: e.target.value })} placeholder='JSON body (optional)' className={`${inputCls} resize-none`} />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function ConditionNode({ id, data }: NodeProps) {
  const update = useUpdate(id);
  return (
    <div className={`${card} border-amber-300`}>
      <Handle type="target" position={Position.Left} />
      <p className={`${label} text-amber-400`}>Condition</p>
      <input value={data.keyword ?? ""} onChange={(e) => update({ keyword: e.target.value })} placeholder="message contains…" className={inputCls} />
      <div className="mt-2 flex flex-col items-end gap-1 pr-1 text-[10px] font-medium text-slate-400">
        <span>match ↗</span>
        <span>else ↘</span>
      </div>
      <Handle type="source" position={Position.Right} id="match" style={{ top: "60%" }} />
      <Handle type="source" position={Position.Right} id="else" style={{ top: "82%" }} />
    </div>
  );
}

const nodeTypes = {
  trigger: TriggerNode,
  send: SendNode,
  ai: AINode,
  tag: TagNode,
  status: StatusNode,
  slack: SlackNode,
  http: HttpNode,
  condition: ConditionNode,
};

export default function AutomationEditor({ automation }: { automation: AutomationData }) {
  return (
    <ReactFlowProvider>
      <Inner automation={automation} />
    </ReactFlowProvider>
  );
}
