// Sends a signed, fake post-call webhook to your app so you can test
// signature checking and the call log without making a real call.
// Usage: ELEVENLABS_WEBHOOK_SECRET=... node scripts/send-test-webhook.mjs [base-url]
import { createHmac } from "node:crypto";

const base = process.argv[2] ?? "http://localhost:3000";
const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
if (!secret) throw new Error("Set ELEVENLABS_WEBHOOK_SECRET");

const body = JSON.stringify({
  type: "post_call_transcription",
  event_timestamp: Math.floor(Date.now() / 1000),
  data: {
    agent_id: "agent_test",
    conversation_id: `conv_test_${Date.now()}`,
    status: "done",
    transcript: [
      { role: "agent", message: "Kia ora, Oneroa Bay Kayaks, Kai speaking." },
      { role: "user", message: "Can I book two kayaks for Saturday afternoon?" },
      { role: "agent", message: "Let me check.", tool_calls: [{ tool_name: "check_availability" }] },
    ],
    metadata: { start_time_unix_secs: Math.floor(Date.now() / 1000) - 90, call_duration_secs: 90 },
    analysis: { call_successful: "success", transcript_summary: "Caller asked about Saturday 3pm for two; test payload." },
  },
});

const t = Math.floor(Date.now() / 1000);
const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
const res = await fetch(`${base}/api/webhooks/post-call`, {
  method: "POST",
  headers: { "content-type": "application/json", "elevenlabs-signature": `t=${t},v0=${sig}` },
  body,
});
console.log(res.status, await res.text());
