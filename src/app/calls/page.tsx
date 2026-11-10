import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listCalls } from "@/lib/calls";
import { usingPersistentStore } from "@/lib/store";

export const metadata = { title: "Call log · Oneroa Bay Kayaks" };

export default function CallsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <Link href="/" className="text-sm text-sky-700 underline dark:text-sky-400">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Call log</h1>
      <p className="mt-2 text-sm text-zinc-500">Filled by the ElevenLabs post-call webhook. Latest 25 calls, newest first.</p>
      <Suspense fallback={<p className="mt-8 text-zinc-500">Loading calls…</p>}>
        <CallList />
      </Suspense>
    </main>
  );
}

async function CallList() {
  await connection(); // read fresh data on every request
  const calls = await listCalls(25);

  return (
    <>
      {!usingPersistentStore() && (
        <p className="mt-2 text-sm text-amber-600">In-memory store: entries may disappear between requests.</p>
      )}
      {calls.length === 0 ? (
        <p className="mt-8 text-zinc-500">No calls yet. Have a conversation, then refresh this page after a minute.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {calls.map((c) => (
            <li key={c.conversation_id} className="rounded-xl border border-black/10 p-4 dark:border-white/15">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{c.channel}</span>
                <span>
                  {c.started_at
                    ? new Date(c.started_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })
                    : "Unknown time"}
                </span>
                {c.duration_secs != null && <span>{c.duration_secs}s</span>}
                {c.call_successful && (
                  <span className={c.call_successful === "success" ? "text-emerald-600" : "text-amber-600"}>
                    {c.call_successful}
                  </span>
                )}
                {c.tools_used.length > 0 && <span className="text-zinc-500">tools: {c.tools_used.join(", ")}</span>}
              </div>
              {c.summary && <p className="mt-2 text-sm">{c.summary}</p>}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-zinc-500">Transcript ({c.transcript.length} turns)</summary>
                <ol className="mt-2 flex flex-col gap-1">
                  {c.transcript.map((t, i) => (
                    <li key={i}>
                      <span className="font-medium">{t.role}:</span> {t.message}
                    </li>
                  ))}
                </ol>
              </details>
              <p className="mt-2 font-mono text-xs text-zinc-400">{c.conversation_id}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
