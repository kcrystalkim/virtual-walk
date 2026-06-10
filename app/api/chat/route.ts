import { NextRequest } from "next/server";

interface Message {
  id: number;
  text: string;
  nickname: string;
  locationEmoji: string;
  locationName: string;
  time: string;
}

// In-memory store (resets on server restart — fine for a demo)
const messages: Message[] = [];
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();

function broadcast(payload: string) {
  const chunk = new TextEncoder().encode(`data: ${payload}\n\n`);
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(chunk);
    } catch {
      clients.delete(ctrl);
    }
  }
}

export async function GET() {
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      clients.add(ctrl);
      // Send message history on connect
      const init = JSON.stringify({ type: "init", messages: messages.slice(-50) });
      ctrl.enqueue(new TextEncoder().encode(`data: ${init}\n\n`));
    },
    cancel() {
      clients.delete(ctrl);
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, nickname, locationEmoji, locationName } = body as Omit<Message, "id" | "time">;

  if (!text?.trim() || !nickname?.trim()) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const message: Message = {
    id: Date.now(),
    text: text.trim().slice(0, 200),
    nickname: nickname.trim().slice(0, 20),
    locationEmoji,
    locationName,
    time: new Date().toISOString(),
  };

  messages.push(message);
  if (messages.length > 200) messages.shift();

  broadcast(JSON.stringify({ type: "message", message }));

  return Response.json({ ok: true });
}
