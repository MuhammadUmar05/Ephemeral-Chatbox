import { NextRequest, NextResponse } from "next/server";

import { nanoid } from "nanoid";
import { redis } from "./lib/redis";

export const proxy = async (req: NextRequest, res: NextResponse) => {
  const pathname = req.nextUrl.pathname;
  const roomMatch = pathname.match(/^\/room\/([^/]+)$/) ?? "";

  const roomID = roomMatch[1];
  if (!roomID) return NextResponse.redirect(new URL("/", req.url));

  const meta = await redis.hgetall<{
    connectedUsers: string[];
    createdAt: number;
  }>(`meta:${roomID}`);

  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url));
  }

  const exisitngToken = req.cookies.get("x-auth-token")?.value;
  if (exisitngToken && meta.connectedUsers.includes(exisitngToken)) {
    return NextResponse.next();
  }

  if (meta.connectedUsers.length >= 2) {
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
  }

  const response = NextResponse.next();

  const token = nanoid();
  response.cookies.set("x-auth-token", token, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  await redis.hset(`meta:${roomID}`, {
    connectedUsers: [...meta.connectedUsers, token],
  });

  return response;
};

export const config = {
  matcher: "/room/:path*",
};
