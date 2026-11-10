# Server tools

Add both in the ElevenLabs dashboard: **Agent → Tools → Add tool → Webhook**.
Replace `https://YOUR-APP.vercel.app` with your deployment URL.

For each tool, add a header `x-tool-secret`, type **Secret**, holding the same value as `TOOL_SECRET` in Vercel.

## check_availability

- **Description:** Checks how many kayaks are free in each session (09:00, 12:00, 15:00) on a given date. Call this before offering any times.
- **Method:** POST
- **URL:** `https://YOUR-APP.vercel.app/api/tools/check-availability`
- **Body parameters:**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| date | string | yes | Trip date in YYYY-MM-DD format, in New Zealand time |
| party_size | integer | yes | Number of people paddling |

Example response:

```json
{
  "date": "2026-11-14",
  "party_size": 2,
  "price_nzd_per_person": 65,
  "sessions": [
    { "session": "09:00", "kayaks_remaining": 8, "fits_party": true },
    { "session": "12:00", "kayaks_remaining": 1, "fits_party": false },
    { "session": "15:00", "kayaks_remaining": 5, "fits_party": true }
  ],
  "any_available": true
}
```

## create_booking

- **Description:** Books kayaks for a session. Only call after the caller has confirmed the date, session, party size and price.
- **Method:** POST
- **URL:** `https://YOUR-APP.vercel.app/api/tools/create-booking`
- **Body parameters:**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| date | string | yes | Trip date in YYYY-MM-DD format |
| session | string | yes | One of "09:00", "12:00", "15:00" |
| party_size | integer | yes | Number of people paddling |
| name | string | yes | Name for the booking |
| phone | string | no | Caller's contact number, if given |

Example response:

```json
{
  "reference": "OBK-7Q2LM",
  "date": "2026-11-14",
  "session": "15:00",
  "party_size": 2,
  "name": "Sam",
  "total_nzd": 130,
  "created_at": "2026-11-11T01:02:03.000Z"
}
```

Validation problems return HTTP 200 with `{ "error": "..." }`, so the agent can read the message and recover instead of treating it as a failed call.
