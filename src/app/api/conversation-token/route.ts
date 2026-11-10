import { store } from "@/lib/store";

const SESSIONS_PER_IP_PER_HOUR = 10;

/**
 * Gives the browser a short-lived WebRTC token for a private agent.
 * The API key stays on the server. A simple per-IP limit stops one
 * visitor from running up the ElevenLabs bill.
 */
export async function GET(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    return Response.json({ error: "Server is missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID" }, { status: 500 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const used = await store.incrBy(`ratelimit:token:${ip}`, 1, 3600);
  if (used > SESSIONS_PER_IP_PER_HOUR) {
    return Response.json({ error: "Too many sessions from this address. Try again in an hour." }, { status: 429 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { "xi-api-key": apiKey }, cache: "no-store" },
  );
  if (!res.ok) {
    // Log the upstream detail for us, but don't leak it to the browser.
    console.error("ElevenLabs token request failed", res.status, await res.text());
    return Response.json({ error: "Could not start a conversation" }, { status: 502 });
  }
  const { token } = (await res.json()) as { token: string };
  return Response.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
