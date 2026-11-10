import { saveCall, toCallRecord } from "@/lib/calls";
import { verifyElevenLabsSignature } from "@/lib/webhook-signature";

/**
 * ElevenLabs post-call webhook. Verifies the signature against the RAW body,
 * stores a summary of `post_call_transcription` events, and acknowledges
 * every other event type so ElevenLabs doesn't keep retrying.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const check = verifyElevenLabsSignature(
    rawBody,
    request.headers.get("elevenlabs-signature"),
    process.env.ELEVENLABS_WEBHOOK_SECRET,
  );
  if (!check.ok) {
    console.warn("Rejected webhook:", check.reason);
    return Response.json({ error: check.reason }, { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Body is not JSON" }, { status: 400 });
  }

  if (event.type === "post_call_transcription" && event.data) {
    const record = toCallRecord(event.data);
    await saveCall(record);
    console.log("Stored call", record.conversation_id, record.channel, record.call_successful);
  } else {
    console.log("Ignored webhook event type:", event.type);
  }
  return Response.json({ received: true });
}
