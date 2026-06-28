import { NextRequest } from 'next/server';
import { sseEmitter } from '@/lib/sse-emitter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Define the listener callback
      const onLiveUpdate = (event: { type: string; data: any }) => {
        if (isClosed) return;
        try {
          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        } catch (e) {
          // Stream might have been closed already
          cleanup();
        }
      };

      // Heartbeat interval to send pings to client every 20 seconds
      const heartbeatInterval = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(': ping\n\n');
        } catch (e) {
          cleanup();
        }
      }, 20000);

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(heartbeatInterval);
        sseEmitter.off('live-update', onLiveUpdate);
        try {
          controller.close();
        } catch (e) {
          // Ignore close errors
        }
      };

      // Listen to the shared event emitter
      sseEmitter.on('live-update', onLiveUpdate);

      // Listen to connection aborts
      req.signal.addEventListener('abort', () => {
        cleanup();
      });

      // Keep connection alive with initial heartbeat
      try {
        controller.enqueue(': heartbeat\n\n');
      } catch (e) {
        cleanup();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
