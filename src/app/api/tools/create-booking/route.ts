import { createBooking, isSession, SESSIONS, validateDate, validatePartySize } from "@/lib/bookings";
import { checkToolSecret, readJson } from "@/lib/tool-auth";

/**
 * Server tool: create_booking
 * Body: { "date": "YYYY-MM-DD", "session": "09:00" | "12:00" | "15:00",
 *         "party_size": number, "name": string, "phone"?: string }
 */
export async function POST(request: Request) {
  const denied = checkToolSecret(request);
  if (denied) return denied;

  const body = await readJson(request);
  if (!body) return Response.json({ error: "Body must be JSON" }, { status: 400 });

  const problem = validateDate(body.date) ?? validatePartySize(body.party_size);
  if (problem) return Response.json(problem);
  if (!isSession(body.session)) {
    return Response.json({ error: `Session must be one of ${SESSIONS.join(", ")}.` });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return Response.json({ error: "Ask the caller for a name for the booking." });

  const result = await createBooking({
    date: body.date as string,
    session: body.session,
    party_size: Number(body.party_size),
    name: name.slice(0, 80),
    phone: typeof body.phone === "string" ? body.phone.slice(0, 30) : undefined,
  });
  return Response.json(result);
}
