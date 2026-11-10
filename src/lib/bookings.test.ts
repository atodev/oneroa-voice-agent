import { describe, expect, it } from "vitest";
import { createBooking, getAvailability, todayInNz, validateDate, validatePartySize } from "./bookings";

describe("todayInNz", () => {
  it("uses New Zealand time, not UTC", () => {
    // 11:30 UTC on 14 Nov is 00:30 on 15 Nov in NZ (daylight time, UTC+13)
    expect(todayInNz(new Date("2026-11-14T11:30:00Z"))).toBe("2026-11-15");
  });
});

describe("validation", () => {
  const now = new Date("2026-11-11T00:00:00Z");
  it("rejects bad and past dates", () => {
    expect(validateDate("14/11/2026", now)).not.toBeNull();
    expect(validateDate("2026-11-01", now)).toMatchObject({ error: "That date is in the past." });
    expect(validateDate("2026-11-14", now)).toBeNull();
  });
  it("rejects party sizes outside 1-8", () => {
    expect(validatePartySize(0)).not.toBeNull();
    expect(validatePartySize(2.5)).not.toBeNull();
    expect(validatePartySize(9)).not.toBeNull();
    expect(validatePartySize("3")).toBeNull();
  });
});

describe("booking capacity", () => {
  it("never overbooks a session", async () => {
    const date = "2099-01-01";
    expect(await createBooking({ date, session: "09:00", party_size: 6, name: "A" })).toHaveProperty("reference");
    expect(await createBooking({ date, session: "09:00", party_size: 3, name: "B" })).toHaveProperty("error");
    expect(await createBooking({ date, session: "09:00", party_size: 2, name: "C" })).toHaveProperty("reference");

    const availability = await getAvailability(date, 1);
    expect(availability.sessions.find((s) => s.session === "09:00")?.kayaks_remaining).toBe(0);
  });

  it("handles simultaneous bookings for the last kayaks", async () => {
    const date = "2099-01-02";
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => createBooking({ date, session: "12:00", party_size: 2, name: `P${i}` })),
    );
    expect(results.filter((r) => "reference" in r)).toHaveLength(4);
  });
});
