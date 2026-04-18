import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/cms/context";
import { subscribe, replayEventsAfter, type BroadcastEvent } from "@/lib/events";

// SSE interno do console operacional (staff autenticado via NextAuth).
// Reaproveita o mesmo barramento de eventos da rota pública /v1/ext/events/stream,
// mas autoriza por sessão do NextAuth em vez de OAuth2 (EventSource do browser
// não suporta headers custom, então não dá pra usar Bearer).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_INTERVAL_MS = 20_000;

export async function GET(req: NextRequest) {
  const ctx = await requireStaff();

  const { searchParams } = new URL(req.url);
  const lastEventId =
    searchParams.get("lastEventId") ?? req.headers.get("last-event-id");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // ignore
          }
        }
      };

      function send(event: BroadcastEvent) {
        if (closed) return;
        const chunk =
          `id: ${event.id}\n` +
          `event: ${event.type}\n` +
          `data: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      }

      controller.enqueue(encoder.encode(`: connected unit=${ctx.activeUnitId}\n\n`));

      try {
        const missed = await replayEventsAfter(ctx.activeUnitId, lastEventId);
        for (const ev of missed) send(ev);
      } catch {
        // segue vivo
      }

      const unsubscribe = subscribe(ctx.activeUnitId, send);

      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          close();
        }
      }, HEARTBEAT_INTERVAL_MS);

      const signal = req.signal;
      const onAbort = () => {
        clearInterval(heartbeat);
        unsubscribe();
        close();
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
