import { auth } from "@/lib/auth";
import { Message, realtime } from "@/lib/realtime";
import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const { roomID, token } = await auth(req);
  const { sender, text }: { sender: string; text: string } = await req.json();

  const message: Message = {
    id: nanoid(),
    sender,
    text,
    roomID,
    timeStamp: Date.now(),
  };

  await redis.rpush(`messages:${roomID}`, { ...message, token });
  await realtime.channel(roomID).emit("chat.message", message);

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { roomID, token } = await auth(req);

  const messages = await redis.lrange<Message>(`messages:${roomID}`, 0, -1);

  return NextResponse.json({
    success: true,
    messages: messages.map((m) => ({
      ...m,
      token: m.token === token ? token : undefined,
    })),
  });
}
