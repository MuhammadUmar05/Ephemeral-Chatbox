import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { redis } from "./lib/redis";

export const proxy = async (req: NextRequest) => {
  const pathname = req.nextUrl.pathname;
  const match = pathname.match(/^\/room\/([^/]+)$/);
  const roomID = match?.[1];

  if (!roomID) return NextResponse.redirect(new URL("/", req.url));

  const meta = await redis.hgetall(`meta:${roomID}`);
  if (!meta) return NextResponse.redirect(new URL("/?error=room-not-found", req.url));

  const token = req.cookies.get("x-auth-token")?.value;

  // check if token already connected
  if (token && (await redis.sismember(`connected:${roomID}`, token))) {
    return NextResponse.next();
  }

  // generate new token
  const newToken = nanoid();

  // atomically add token to the set
  const added = await redis.sadd(`connected:${roomID}`, newToken);

  const count = await redis.scard(`connected:${roomID}`);
  if (count > 2) {
    // room full → remove the token we just added
    await redis.srem(`connected:${roomID}`, newToken);
    return NextResponse.redirect(new URL("/?error=room-full", req.url));
  }

  // set token cookie
  const response = NextResponse.next();
  response.cookies.set("x-auth-token", newToken, {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
};

export const config = {
  matcher: "/room/:path*",
};
