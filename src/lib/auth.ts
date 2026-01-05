import { NextRequest } from "next/server";
import { redis } from "./redis";

function extractRoomId(req: NextRequest) {
  const fromQuery = req.nextUrl.searchParams.get("roomid");
  if (fromQuery) return fromQuery;

  const match = req.nextUrl.pathname.match(/^\/room\/([^/]+)/);
  return match?.[1];
}

export const auth = async (req: NextRequest) => {
  const roomID = extractRoomId(req);
  if(!roomID)
  console.log(roomID);
  const token = req.cookies.get("x-auth-token")?.value;
  if (!roomID || !token) {
    throw new Error("Missing roomID or token");
  }
  const connectedUsers = await redis.hget<string[]>(
    `meta:${roomID}`,
    "connectedUsers"
  );

  if (!connectedUsers?.includes(token)) {
    throw new Error("Unauthorized or invalid token");
  }

  return { roomID, token, connectedUsers };
};
