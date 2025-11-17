import { NextResponse } from "next/server";
import {
  getServerLogs,
  subscribeServerLogs,
} from "../../../server/logs/logStore";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const logId = url.searchParams.get("logId");
  if (!logId) return new NextResponse("Missing logId", { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      console.debug("SSE: new connection", logId);
      // send existing logs as a batch
      try {
        const existing = getServerLogs(logId);
        for (const e of existing) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        }
      } catch (e) {
        // ignore
      }

      const onLog = (entry: any) => {
        try {
          // debug: echo when sending a new log over SSE
          console.debug(`SSE: dispatch ${logId}`, entry);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(entry)}\n\n`)
          );
        } catch (err) {
          // ignore
        }
      };

      const unsub = subscribeServerLogs(logId, onLog);
      console.debug("SSE: subscribed", logId);

      // send keepalive pings to avoid proxy closing idle connections
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:\n\n`));
        } catch (err) {
          // ignore
        }
      }, 15_000);

      // Abort on client disconnect
      const onAbort = () => {
        clearInterval(keepalive);
        unsub();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener("abort", onAbort);
    },
    cancel() {
      // noop - abort handler cleans up
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
