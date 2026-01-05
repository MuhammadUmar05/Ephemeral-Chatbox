"use client";
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { useUsername } from "@/hooks/use-username";
import { Message } from "@/lib/realtime";
import { format } from "date-fns";
import { useRealtime } from "@/lib/realtime-client";
import { useRouter } from "next/navigation";

const formatTimeRemaining = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

function page() {
  const router = useRouter();
  const { username } = useUsername();
  const [isCopied, setIsCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const [input, setInput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const params = useParams();
  const roomID = params.roomid as string;

  const sendMessage = async () => {
    if (!input) return;
    try {
      const response = axios.post(`/api/messages?roomid=${roomID}`, {
        text: input,
        sender: username,
      });
    } catch (error) {
      console.log("error sending message", error);
    } finally {
      setInput("");
    }
  };

  const getMessages = async () => {
    try {
      const response = await axios.get(`/api/messages?roomid=${roomID}`);
      setMessages(response.data.messages);
    } catch (error) {
      console.log("error getting all messages", error);
    }
  };
  const getTTL = async () => {
    try {
      const response = await axios.get(`/api/room/create?roomid=${roomID}`);
      return response.data.data.ttl;
    } catch (error) {
      console.log("error getting ttl (remaining time)", error);
    }
  };

  const destroyRoom = async () => {
    axios.delete(`/api/room/create?roomid=${roomID}`);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    getMessages();
  }, []);

  useEffect(() => {
    (async () => {
      const ttl = await getTTL();
      if (typeof ttl === "number") {
        setTimeRemaining(ttl);
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return;

    if (timeRemaining === 0) {
      router.push("/?destroyed=true");
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, router]);

  useRealtime({
    channels: [roomID],
    events: ["chat.message", "chat.destroy"],
    onData: ({ event }) => {
      if (event === "chat.message") {
        getMessages();
      }
      if (event === "chat.destroy") {
        router.push("/?destroyed=true");
      }
    },
  });

  return (
    <main className="relative flex flex-col h-screen max-h-screen overflow-hidden background-image">
      <header className="backdrop border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <p className="text-xs text-zinc-500 uppercase">ROOM ID</p>
            <span className="flex items-center gap-2">
              <p className="font-bold text-xs sm:text-base text-green-500 truncate">
                {roomID.slice(0, 10) + "..."}
              </p>
              <button
                onClick={copyLink}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {isCopied ? "COPIED!" : "COPY"}
              </button>
            </span>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 uppercase">
              SELF-DESTRUCT
            </span>
            <p
              className={`text-sm font-bold flex items-center gap-2 ${
                timeRemaining !== null && timeRemaining < 90
                  ? "text-red-500 animate-pulse"
                  : "text-amber-500"
              }`}
            >
              {timeRemaining !== null
                ? formatTimeRemaining(timeRemaining)
                : "--:--"}
            </p>
          </div>
        </div>
        <button
          onClick={destroyRoom}
          className="text-xs bg-zinc-800 hover:bg-red-600 px-3 py-1.5 rounded text-zinc-400 hover:text-white font-bold transition-all group flex items-center gap-2 disabled:opacity-50"
        >
          <span className="group-hover:animate-pulse">💣</span> DESTROY NOW
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 mb-16 space-y-4 no-scrollbar">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-400 text-sm font-mono">
              No messages yet, start the conversation
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === username ? "justify-end" : "justify-start"
            }`}
          >
            <div className="max-w-[80%]">
              <div className="flex items-baseline gap-3 mb-1">
                <span
                  className={`text-xs font-bold ${
                    msg.sender === username ? "text-green-500" : "text-blue-500"
                  }`}
                >
                  {msg.sender === username ? "YOU" : msg.sender}
                </span>

                <span className="text-[10px] text-zinc-600">
                  {format(msg.timeStamp, "HH:mm")}
                </span>
              </div>

              <p
                className={`px-4 py-2 rounded-2xl text-sm leading-relaxed wrap-break-word max-w-full
          ${
            msg.sender === username
              ? "bg-green-600/10 text-green-600 border border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
              : "bg-blue-600/10 text-blue-600 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
          }`}
              >
                {msg.text}
              </p>

              <div ref={scrollRef} />
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl">
        <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-zinc-950/70 shadow-2xl border border-zinc-800 backdrop-blur-xl backdrop">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
              {">"}
            </span>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type message..."
              className="w-full bg-zinc-900/70 rounded-full py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 border border-zinc-800 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>

          <button
            disabled={!input.trim()}
            onClick={sendMessage}
            className="h-11 w-11 flex items-center justify-center rounded-full bg-green-600 text-black font-bold hover:scale-110 active:scale-95 transition-all shadow-lg disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </div>
    </main>
  );
}

export default page;
