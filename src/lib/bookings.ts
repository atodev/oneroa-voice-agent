import { store } from "./store";

export const BUSINESS_TZ = "Pacific/Auckland";
export const SESSIONS = ["09:00", "12:00", "15:00"] as const;
export type Session = (typeof SESSIONS)[number];
export const KAYAKS_PER_SESSION = 8;
export const PRICE_NZD_PER_PERSON = 65;
const MAX_DAYS_AHEAD = 60;

export type ValidationError = { error: string };

/** Today's date (YYYY-MM-DD) in New Zealand, not the server's timezone. */
export function todayInNz(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ }).format(now);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** Checks a date the caller asked for. Returns an error message the agent can read out. */
export function validateDate(date: unknown, now = new Date()): ValidationError | null {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { error: "Date must be in YYYY-MM-DD format." };
  }
  const ahead = daysBetween(todayInNz(now), date);
  if (ahead < 0) return { error: "That date is in the past." };
  if (ahead > MAX_DAYS_AHEAD) return { error: `We only take bookings up to ${MAX_DAYS_AHEAD} days ahead.` };
  return null;
}

export function validatePartySize(size: unknown): ValidationError | null {
  const n = Number(size);
  if (!Number.isInteger(n) || n < 1) return { error: "Party size must be a whole number of at least 1." };
  if (n > KAYAKS_PER_SESSION) {
    return { error: `The largest group per session is ${KAYAKS_PER_SESSION}. Suggest splitting across sessions.` };
  }
  return null;
}

const slotKey = (date: string, session: Session) => `slot:${date}:${session}`;

export async function getAvailability(date: string, partySize: number) {
  const sessions = await Promise.all(
    SESSIONS.map(async (session) => {
      const booked = await store.get(slotKey(date, session));
      const remaining = Math.max(0, KAYAKS_PER_SESSION - booked);
      return { session, kayaks_remaining: remaining, fits_party: remaining >= partySize };
    }),
  );
  return {
    date,
    party_size: partySize,
    price_nzd_per_person: PRICE_NZD_PER_PERSON,
    sessions,
    any_available: sessions.some((s) => s.fits_party),
  };
}

export type Booking = {
  reference: string;
  date: string;
  session: Session;
  party_size: number;
  name: string;
  phone?: string;
  total_nzd: number;
  created_at: string;
};

/**
 * Reserves kayaks. Increments first, then rolls back if that overbooked
 * the slot, so two bookings at the same moment can't both take the last kayaks.
 */
export async function createBooking(input: {
  date: string;
  session: Session;
  party_size: number;
  name: string;
  phone?: string;
}): Promise<Booking | ValidationError> {
  const key = slotKey(input.date, input.session);
  const bookedAfter = await store.incrBy(key, input.party_size);
  if (bookedAfter > KAYAKS_PER_SESSION) {
    await store.incrBy(key, -input.party_size);
    const remaining = Math.max(0, KAYAKS_PER_SESSION - (bookedAfter - input.party_size));
    return { error: `Not enough kayaks left in the ${input.session} session. ${remaining} remaining.` };
  }

  const booking: Booking = {
    reference: `OBK-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    ...input,
    total_nzd: input.party_size * PRICE_NZD_PER_PERSON,
    created_at: new Date().toISOString(),
  };
  await store.pushJson("bookings", booking, 200);
  return booking;
}

export function isSession(value: unknown): value is Session {
  return typeof value === "string" && (SESSIONS as readonly string[]).includes(value);
}
