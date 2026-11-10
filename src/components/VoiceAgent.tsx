"use client";

import { ConversationProvider, useConversation, type MessagePayload } from "@elevenlabs/react";
import { useCallback, useState } from "react";

type Line = { id: number; role: "user" | "agent" | "system"; text: string };

export default function VoiceAgent() {
  return (
    <ConversationProvider>
      <AgentPanel />
    </ConversationProvider>
  );
}

function AgentPanel() {
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState("");

  const addLine = useCallback((role: Line["role"], text: string) => {
    setLines((prev) => [...prev, { id: Date.now() + Math.random(), role, text }]);
  }, []);

  const conversation = useConversation({
    onConnect: () => addLine("system", "Connected. Say hello!"),
    onDisconnect: () => addLine("system", "Conversation ended."),
    onMessage: (m: MessagePayload) => addLine(m.role === "user" ? "user" : "agent", m.message),
    onError: (message: unknown) => setError(typeof message === "string" ? message : "Connection error"),
  });

  const { status, isSpeaking } = conversation;
  const connected = status === "connected";

  async function start() {
    setError(null);
    setStarting(true);
    try {
      // Ask for the mic first so a denied permission gives a clear message.
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked. Allow it in your browser's site settings and try again.");
      setStarting(false);
      return;
    }
    try {
      const res = await fetch("/api/conversation-token", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Token request failed (${res.status})`);
      setLines([]);
      conversation.startSession({ conversationToken: body.token, connectionType: "webrtc" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the conversation");
    } finally {
      setStarting(false);
    }
  }

  function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    conversation.sendUserMessage(draft.trim());
    addLine("user", draft.trim());
    setDraft("");
  }

  return (
    <section className="w-full max-w-xl rounded-2xl border border-black/10 dark:border-white/15 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              connected ? (isSpeaking ? "bg-sky-500 animate-pulse" : "bg-emerald-500") : "bg-zinc-400"
            }`}
            aria-hidden
          />
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {connected ? (isSpeaking ? "Agent speaking" : "Listening") : status === "connecting" ? "Connecting…" : "Not connected"}
          </span>
        </div>
        {connected ? (
          <button onClick={() => conversation.endSession()} className="rounded-full bg-rose-600 px-5 py-2 text-white hover:bg-rose-700">
            End call
          </button>
        ) : (
          <button
            onClick={start}
            disabled={starting || status === "connecting"}
            className="rounded-full bg-sky-700 px-5 py-2 text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {starting || status === "connecting" ? "Starting…" : "Talk to the agent"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      )}

      <ol className="mt-5 flex max-h-80 flex-col gap-2 overflow-y-auto text-sm" aria-live="polite">
        {lines.map((l) => (
          <li
            key={l.id}
            className={
              l.role === "system"
                ? "text-center text-xs text-zinc-500"
                : l.role === "user"
                  ? "self-end rounded-2xl bg-sky-700 px-3 py-2 text-white"
                  : "self-start rounded-2xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800"
            }
          >
            {l.text}
          </li>
        ))}
      </ol>

      {connected && (
        <form onSubmit={sendText} className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Or type a message…"
            className="flex-1 rounded-full border border-black/15 bg-transparent px-4 py-2 text-sm dark:border-white/20"
          />
          <button className="rounded-full border border-black/15 px-4 py-2 text-sm dark:border-white/20">Send</button>
        </form>
      )}
    </section>
  );
}
