import { auth } from "@/lib/auth";
import { Message, realtime } from "@/lib/realtime";
import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const POST = async (req: NextRequest, res: NextResponse) => {
  const { connectedUsers, roomID, token } = await auth(req);
  const { sender, text }: { sender: string; text: string } = await req.json();
  const roomExists = await redis.exists(`meta:${roomID}`);
  if (!roomExists) {
    throw new Error("Room does not exist");
  }
  const message: Message = {
    id: nanoid(),
    sender,
    text,
    roomID,
    timeStamp: Date.now(),
  };

  await redis.rpush(`messages:${roomID}`, {
    ...message,
    token,
  });

  await realtime.channel(roomID).emit("chat.message", message);
  const remainingTime = await redis.ttl(`meta:${roomID}`);
  await redis.expire(`messages:${roomID}`, remainingTime);
  await redis.expire(`history:${roomID}`, remainingTime);
  await redis.expire(roomID, remainingTime);

  return NextResponse.json({
    success: true,
    message: "message sent successfully",
  });
};

export const GET = async (req: NextRequest, res: NextResponse) => {
  const { connectedUsers, roomID, token } = await auth(req);
  const messages = await redis.lrange<Message>(`messages:${roomID}`, 0, -1);
  return NextResponse.json({
    success: true,
    message: "messages received successfully successfully",
    messages: messages.map((message) => ({
      ...message,
      token: message.token === token ? token : undefined,
    })),
  });
};
