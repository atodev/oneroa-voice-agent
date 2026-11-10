import { getAvailability, validateDate, validatePartySize } from "@/lib/bookings";
import { checkToolSecret, readJson } from "@/lib/tool-auth";

/**
 * Server tool: check_availability
 * Body: { "date": "YYYY-MM-DD", "party_size": number }
 *
 * Validation problems come back as 200 with an `error` field, not 4xx, so the
 * agent reads the message and can ask the caller again instead of failing.
 */
export async function POST(request: Request) {
  const denied = checkToolSecret(request);
  if (denied) return denied;

  const body = await readJson(request);
  if (!body) return Response.json({ error: "Body must be JSON" }, { status: 400 });

  const problem = validateDate(body.date) ?? validatePartySize(body.party_size);
  if (problem) return Response.json(problem);

  return Response.json(await getAvailability(body.date as string, Number(body.party_size)));
}
