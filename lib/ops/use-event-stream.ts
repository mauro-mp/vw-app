"use client";

import { useEffect, useRef, useState } from "react";

export type SseEvent = {
  id: string;
  unitId: string;
  type: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

// Consome /v1/ext/events/stream usando EventSource nativo.
// O token OAuth2 é passado em cookie ou header — EventSource não aceita
// headers custom, então expomos o stream em uma rota interna do próprio
// console (Next.js route handler) que usa a sessão NextAuth para autorizar
// e faz proxy para o stream protegido.

export function useEventStream(src: string, onEvent: (e: SseEvent) => void) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const lastEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (stopped) return;
      setStatus("connecting");
      const url = lastEventIdRef.current
        ? `${src}?lastEventId=${encodeURIComponent(lastEventIdRef.current)}`
        : src;
      es = new EventSource(url, { withCredentials: true });

      es.onopen = () => setStatus("open");
      es.onerror = () => {
        setStatus("error");
        es?.close();
        es = null;
        if (!stopped) retryTimer = setTimeout(connect, 3000);
      };

      // Mensagens com `event:` custom chegam por addEventListener.
      const handler = (ev: MessageEvent) => {
        if (ev.lastEventId) lastEventIdRef.current = ev.lastEventId;
        try {
          const data = JSON.parse(ev.data) as SseEvent;
          onEvent(data);
        } catch {
          // ignore malformed
        }
      };
      // Catch-all para todos os tipos de evento emitidos.
      const knownTypes = [
        "ORDER_CREATED",
        "ORDER_CONFIRMED",
        "ORDER_PREPARING",
        "ORDER_CONCLUDED",
        "ORDER_CANCELLED",
        "REQUEST_CREATED",
        "REQUEST_ACKNOWLEDGED",
        "REQUEST_RESOLVED",
        "REQUEST_DISMISSED",
        "TABLE_OCCUPIED",
        "TABLE_RELEASED",
        "MENU_UPDATED",
        "DAILY_FEATURE_UPDATED",
      ];
      for (const t of knownTypes) es.addEventListener(t, handler as EventListener);
      es.onmessage = handler; // fallback para eventos sem `event:` header
    }

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
      setStatus("closed");
    };
  }, [src, onEvent]);

  return status;
}
