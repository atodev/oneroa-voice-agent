import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 30 * 60;

export type VerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * Verifies an ElevenLabs webhook signature.
 *
 * Header format: `t=<unix seconds>,v0=<hex HMAC-SHA256 of "<t>.<raw body>">`.
 * Same scheme as the official SDK's `webhooks.constructEvent`, but uses a
 * timing-safe comparison and also rejects timestamps from the future.
 *
 * `rawBody` must be the exact bytes received. Parsing and re-serialising the
 * JSON first changes the bytes and the signature will never match.
 */
export function verifyElevenLabsSignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifyResult {
  if (!secret) return { ok: false, reason: "Webhook secret not configured" };
  if (!header) return { ok: false, reason: "Missing ElevenLabs-Signature header" };

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  const v0 = parts.v0;
  if (!Number.isFinite(t) || !v0) return { ok: false, reason: "Malformed signature header" };
  if (Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) {
    return { ok: false, reason: "Timestamp outside tolerance (check for replay or clock skew)" };
  }

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v0, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "Signature mismatch" };
  }
  return { ok: true };
}

/** Builds a valid header. Used by tests and the local test script. */
export function signForTest(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)) {
  const v0 = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return `t=${t},v0=${v0}`;
}
