import { describe, expect, it } from "vitest";
import { signForTest, verifyElevenLabsSignature } from "./webhook-signature";

const secret = "wsec_test";
const body = JSON.stringify({ type: "post_call_transcription", data: { conversation_id: "c1" } });
const now = 1_800_000_000;

describe("verifyElevenLabsSignature", () => {
  it("accepts a correctly signed body", () => {
    expect(verifyElevenLabsSignature(body, signForTest(body, secret, now), secret, now)).toEqual({ ok: true });
  });

  it("rejects a body changed after signing", () => {
    const header = signForTest(body, secret, now);
    const r = verifyElevenLabsSignature(body.replace("c1", "c2"), header, secret, now);
    expect(r).toEqual({ ok: false, reason: "Signature mismatch" });
  });

  it("rejects re-serialised JSON (raw body matters)", () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyElevenLabsSignature(pretty, signForTest(body, secret, now), secret, now).ok).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(verifyElevenLabsSignature(body, signForTest(body, "other", now), secret, now).ok).toBe(false);
  });

  it("rejects old timestamps", () => {
    const header = signForTest(body, secret, now - 31 * 60);
    expect(verifyElevenLabsSignature(body, header, secret, now)).toMatchObject({ ok: false });
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyElevenLabsSignature(body, null, secret, now).ok).toBe(false);
    expect(verifyElevenLabsSignature(body, "garbage", secret, now).ok).toBe(false);
  });

  it("fails closed when no secret is configured", () => {
    expect(verifyElevenLabsSignature(body, signForTest(body, secret, now), undefined, now).ok).toBe(false);
  });
});
