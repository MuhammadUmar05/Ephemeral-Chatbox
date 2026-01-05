"use client"
import { RealtimeProvider } from "@upstash/realtime/client";
import React from "react";

function Provider({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider>{children}</RealtimeProvider>;
}

export default Provider;
