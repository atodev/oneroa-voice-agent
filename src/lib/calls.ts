import { store } from "./store";

export type CallRecord = {
  conversation_id: string;
  channel: "phone" | "web";
  started_at: string | null;
  duration_secs: number | null;
  call_successful: string | null;
  summary: string | null;
  termination_reason: string | null;
  tools_used: string[];
  transcript: { role: string; message: string }[];
  received_at: string;
};

type Turn = {
  role?: string;
  message?: string | null;
  tool_calls?: { tool_name?: string }[] | null;
};

/**
 * Pulls the fields we show from a post_call_transcription payload.
 * Written defensively: fields can be missing or null, and a webhook
 * handler that throws on an unexpected shape just causes retries.
 */
export function toCallRecord(data: Record<string, unknown>): CallRecord {
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const analysis = (data.analysis ?? {}) as Record<string, unknown>;
  const turns = Array.isArray(data.transcript) ? (data.transcript as Turn[]) : [];
  const start = typeof metadata.start_time_unix_secs === "number" ? metadata.start_time_unix_secs : null;

  const tools = new Set<string>();
  for (const t of turns) for (const c of t.tool_calls ?? []) if (c?.tool_name) tools.add(c.tool_name);

  return {
    conversation_id: String(data.conversation_id ?? "unknown"),
    channel: metadata.phone_call ? "phone" : "web",
    started_at: start ? new Date(start * 1000).toISOString() : null,
    duration_secs: typeof metadata.call_duration_secs === "number" ? metadata.call_duration_secs : null,
    call_successful: typeof analysis.call_successful === "string" ? analysis.call_successful : null,
    summary: typeof analysis.transcript_summary === "string" ? analysis.transcript_summary : null,
    termination_reason: typeof metadata.termination_reason === "string" ? metadata.termination_reason : null,
    tools_used: [...tools],
    transcript: turns
      .filter((t) => t.message)
      .map((t) => ({ role: t.role ?? "unknown", message: String(t.message).slice(0, 1000) })),
    received_at: new Date().toISOString(),
  };
}

export async function saveCall(record: CallRecord) {
  await store.pushJson("calls", record, 50);
}

export async function listCalls(count = 25) {
  return store.listJson<CallRecord>("calls", count);
}
