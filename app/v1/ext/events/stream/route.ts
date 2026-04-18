import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { subscribe, replayEventsAfter, type BroadcastEvent } from "@/lib/events";

// GET /v1/ext/events/stream
// Server-Sent Events — empurra eventos da unit conectada ao cliente.
// Reconexão: envie `Last-Event-ID: <eventId>` para replay dos eventos perdidos.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_INTERVAL_MS = 20_000;

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireApiAuth(req);
  if (error) return error;

  const lastEventId = req.headers.get("last-event-id");
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

      // Comentário inicial (serve como handshake + força alguns proxies a commitar o stream)
      controller.enqueue(encoder.encode(`: connected unit=${ctx.unitId}\n\n`));

      // Replay
      try {
        const missed = await replayEventsAfter(ctx.unitId, lastEventId);
        for (const ev of missed) send(ev);
      } catch {
        // ignora falha de replay — conexão live segue.
      }

      // Subscribe
      const unsubscribe = subscribe(ctx.unitId, send);

      // Heartbeat — comentários SSE (linhas começando com `:`).
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          close();
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup quando o cliente desconecta (abort signal).
      const signal = req.signal;
      const onAbort = () => {
        clearInterval(heartbeat);
        unsubscribe();
        close();
      };
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort);
      }
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
