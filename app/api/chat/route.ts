import { NextRequest } from "next/server";

interface Message {
  id: number;
  text: string;
  nickname: string;
  locationEmoji: string;
  locationName: string;
  time: string;
}

interface SmokeRank {
  nickname: string;
  locationEmoji: string;
  totalMs: number; // 누적 흡연 시간 (ms)
}

const messages: Message[] = [];
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const smokers = new Map<string, string>();           // nickname → locationEmoji
const smokeStart = new Map<string, number>();         // nickname → 흡연 시작 timestamp
const smokeRanking = new Map<string, SmokeRank>();   // nickname → 누적 시간

function broadcast(payload: string) {
  const chunk = new TextEncoder().encode(`data: ${payload}\n\n`);
  for (const ctrl of clients) {
    try { ctrl.enqueue(chunk); } catch { clients.delete(ctrl); }
  }
}

function getRanking() {
  return [...smokeRanking.values()]
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 10);
}

export async function GET() {
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      clients.add(ctrl);
      ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
        type: "init",
        messages: messages.slice(-50),
        smokers: Object.fromEntries(smokers),
        ranking: getRanking(),
      })}\n\n`));
    },
    cancel() { clients.delete(ctrl); },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.type === "smoke") {
    const { nickname, locationEmoji, smoking } = body;

    if (smoking) {
      smokers.set(nickname, locationEmoji);
      smokeStart.set(nickname, Date.now());
    } else {
      smokers.delete(nickname);
      const start = smokeStart.get(nickname);
      if (start) {
        const duration = Date.now() - start;
        smokeStart.delete(nickname);
        const prev = smokeRanking.get(nickname);
        smokeRanking.set(nickname, {
          nickname,
          locationEmoji,
          totalMs: (prev?.totalMs ?? 0) + duration,
        });
      }
    }

    broadcast(JSON.stringify({
      type: "smokers",
      smokers: Object.fromEntries(smokers),
      ranking: getRanking(),
    }));
    return Response.json({ ok: true });
  }

  const { text, nickname, locationEmoji, locationName } = body as Omit<Message, "id" | "time">;
  if (!text?.trim() || !nickname?.trim()) return Response.json({ error: "invalid" }, { status: 400 });

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
