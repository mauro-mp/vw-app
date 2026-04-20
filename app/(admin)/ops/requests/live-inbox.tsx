"use client";

import { useCallback, useState } from "react";
import { Trash2 } from "lucide-react";
import { useEventStream, type SseEvent } from "@/lib/ops/use-event-stream";
import { deleteRequest, deleteRequests } from "./actions";

export type RequestView = {
  id: string;
  type: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";
  tableNumber?: string;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  ORDER: "Pedido",
  CALL_WAITER: "Chamar garçom",
  PHYSICAL_MENU: "Cardápio físico",
  CHECK: "Conta",
  COMPLAINT: "Reclamação",
  ORDER_CHANGE: "Alterar pedido",
  ORDER_STATUS: "Status do pedido",
  ORDER_CANCEL: "Cancelar pedido",
  ALLERGY_INFO: "Alergia/restrição",
  CUSTOM_ITEM: "Item customizado",
  OTHER: "Outro",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em andamento",
  RESOLVED: "Resolvida",
  DISMISSED: "Dispensada",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RequestsLiveInbox({ initial }: { initial: RequestView[] }) {
  const [requests, setRequests] = useState<RequestView[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const onEvent = useCallback((ev: SseEvent) => {
    if (ev.entityType !== "Request") return;
    const dto = ev.payload as unknown as RequestView;
    setRequests((prev) => {
      const idx = prev.findIndex((r) => r.id === dto.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = dto;
        return next;
      }
      return [dto, ...prev];
    });
  }, []);

  useEventStream("/ops/api/events/stream", onEvent);

  const allChecked = requests.length > 0 && selected.size === requests.length;

  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(requests.map((r) => r.id)));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleDeleteOne = async (id: string) => {
    setBusy(true);
    await deleteRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setBusy(false);
  };

  const handleDeleteSelected = async () => {
    if (!selected.size) return;
    setBusy(true);
    const ids = Array.from(selected);
    await deleteRequests(ids);
    setRequests((prev) => prev.filter((r) => !ids.includes(r.id)));
    setSelected(new Set());
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      {/* Barra de ações em massa */}
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          minHeight: "40px",
        }}
      >
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          disabled={requests.length === 0}
          className="rounded"
          style={{ accentColor: "var(--primary)" }}
        />
        {selected.size > 0 ? (
          <>
            <span style={{ color: "var(--muted)" }}>
              {selected.size} selecionada{selected.size > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleDeleteSelected}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#fca5a5",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <Trash2 size={12} />
              Excluir selecionadas
            </button>
          </>
        ) : (
          <span style={{ color: "var(--muted)" }}>
            {requests.length} solicitaç{requests.length === 1 ? "ão" : "ões"}
          </span>
        )}
      </div>

      {/* Tabela */}
      {requests.length === 0 ? (
        <div
          className="rounded-lg p-12 text-center text-sm"
          style={{
            border: "1px dashed var(--border)",
            color: "var(--muted)",
          }}
        >
          Nenhuma solicitação encontrada.
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <th className="w-10 px-3 py-2.5" />
                <th className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Data/hora
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Tipo
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Mesa
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Status
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium" style={{ color: "var(--muted)" }}>
                  Descrição
                </th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: selected.has(r.id) ? "var(--surface)" : "transparent",
                  }}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      style={{ accentColor: "var(--primary)" }}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: "var(--muted)" }}>
                    {fmtDate(r.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: "rgba(196,88,10,0.18)",
                        color: "var(--primary)",
                      }}
                    >
                      {TYPE_LABEL[r.type] ?? r.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {r.tableNumber ? `Mesa ${r.tableNumber}` : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--muted)" }}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </td>
                  <td className="px-3 py-3 text-sm max-w-xs">
                    <span className="line-clamp-2">{r.description}</span>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleDeleteOne(r.id)}
                      disabled={busy}
                      className="p-1.5 rounded-md transition-colors disabled:opacity-30"
                      style={{ color: "var(--muted)" }}
                      title="Excluir"
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "#fca5a5";
                        (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--muted)";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
