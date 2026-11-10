import { timingSafeEqual } from "node:crypto";

/**
 * Server tools are public URLs, so anyone could call them. The agent sends a
 * shared secret in the `x-tool-secret` header (stored as a Secret in the
 * ElevenLabs tool config) and we reject requests without it.
 */
export function checkToolSecret(request: Request): Response | null {
  const expected = process.env.TOOL_SECRET;
  if (!expected) {
    return Response.json({ error: "TOOL_SECRET is not configured on the server" }, { status: 500 });
  }
  const given = request.headers.get("x-tool-secret") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }
  return null;
}

/** Reads a JSON body without throwing, so a bad request gets a clear 400. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
