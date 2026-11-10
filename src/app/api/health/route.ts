import { connection } from "next/server";
import { usingPersistentStore } from "@/lib/store";

/** Quick config check. Shows which settings are present, never their values. */
export async function GET() {
  await connection(); // check env at request time, not build time
  const has = (name: string) => Boolean(process.env[name]);
  return Response.json({
    ok: true,
    config: {
      ELEVENLABS_API_KEY: has("ELEVENLABS_API_KEY"),
      ELEVENLABS_AGENT_ID: has("ELEVENLABS_AGENT_ID"),
      ELEVENLABS_WEBHOOK_SECRET: has("ELEVENLABS_WEBHOOK_SECRET"),
      TOOL_SECRET: has("TOOL_SECRET"),
      persistent_store: usingPersistentStore(),
    },
  });
}
