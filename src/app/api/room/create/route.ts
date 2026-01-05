import { auth } from "@/lib/auth";
import { realtime } from "@/lib/realtime";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

const ROOM_TTL_SECONDS = 600;

export const POST = async () => {
  const roomID = nanoid();
  await redis.hset(`meta:${roomID}`, {
    connectedUsers: [],
    createdAt: Date.now(),
  });

  await redis.expire(`meta:${roomID}`, ROOM_TTL_SECONDS);
  return NextResponse.json({
    message: "room is created",
    success: true,
    data: { roomID },
  });
};

export const GET = async (req: NextRequest) => {
  const { connectedUsers, roomID, token } = await auth(req);
  const ttl = await redis.ttl(`meta:${roomID}`);
  return NextResponse.json({
    message: "remaining time is fetched",
    success: true,
    data: { ttl: ttl > 0 ? ttl : 0 },
  });
};

export const DELETE = async (req: NextRequest) => {
  const { connectedUsers, roomID, token } = await auth(req);
  await realtime.channel(roomID).emit("chat.destroy", { isDestroyed: true });
  await Promise.all([
    redis.del(roomID),
    redis.del(`meta:${roomID}`),
    redis.del(`messages:${roomID}`),
  ]);
  return NextResponse.json({
    message: "room destroyed successfully",
    success: true,
  });
};
