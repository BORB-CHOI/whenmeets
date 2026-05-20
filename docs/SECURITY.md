# Security Posture

This document captures the current security stance of DayMeet and the gaps
we know about. It is intentionally honest — anything not listed here as "in
place" is something we have NOT shipped yet.

## In place

### Authentication & authorization
- Supabase Auth (Google OAuth) for logged-in users.
- Anonymous participant flow gated by event-level password + per-event signed
  cookie (`daymeet_auth_{eventId}`, HttpOnly + SameSite=strict + Secure in prod).
- All writes go through Next.js API routes that use the Supabase **service role
  key** server-side. The anon key is never used for writes.
- Row Level Security enabled on `events`, `participants`, `folders`.
  `anon` role can only read public views (`events_public`, `participants_public`)
  which exclude `password_hash` and similar secrets.
- Per-route authorization checks: event `PATCH/DELETE` requires the
  creator's OAuth session; folder `PATCH/DELETE/move` requires folder/event
  owner; participant edits verified via session cookie or participant password.

### Passwords
- Event passwords + participant passwords hashed with **bcrypt cost 10**.
- `bcrypt.compare` runs in constant time.

### Input validation
- Title length, date count, time range, date format, mode value, and
  participant name length all validated on the server.
- Calendar dates are sanity-checked (e.g. rejects `2026-02-31`).
- UUIDs validated with a strict regex in folder/move endpoints.

### Rate limiting (this PR)
- In-memory token-bucket rate limiter per (route, client IP):
  - `POST /api/events` — 20 / min
  - `POST /api/events/:id/participants` — 30 / min
  - `POST /api/events/:id/verify` — 8 / min (blunts password brute force)
  - `POST /api/folders` — 20 / min
- Implemented in `src/middleware.ts` + `src/lib/rate-limit.ts`.
- 429 response includes `Retry-After` and `X-RateLimit-*` headers.
- **Limitation**: in-memory state is per-Edge-isolate. On serverless platforms
  (Vercel) this only defends within a single warm function instance, not
  globally across regions. For distributed throttling, swap to
  `@upstash/ratelimit` + Upstash Redis or Vercel KV.

### Security headers (this PR)
Applied to every response via `next.config.ts`:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

### Other defaults
- Cookies use `SameSite=strict` (event password gate) or `SameSite=Lax`
  (Supabase session) with `HttpOnly` and `Secure` in production.
- Soft delete on events (`deleted_at`). All queries filter by `IS NULL`.
- API errors return generic strings — no DB schema or stack traces leaked.

## Known gaps

### Content-Security-Policy (not shipped)
The third-party scripts we load (AdSense, Google Analytics, Microsoft Clarity)
all require inline scripts and many cross-origin script/style sources.
A nonce-based CSP needs:
1. A request-scoped nonce generated in middleware.
2. All inline `<script>` blocks emitting `nonce={nonce}`.
3. A `script-src 'self' 'nonce-{X}' https://pagead2.googlesyndication.com ...`
   policy that enumerates every embed origin.

Until that's wired, we'd ship a `Content-Security-Policy-Report-Only` first
to confirm we haven't missed any source.

### Distributed rate limiting (not shipped)
See above — current rate limiting is best-effort, single-instance only.
Production path: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
and replace `src/lib/rate-limit.ts` with `@upstash/ratelimit`.

### CSRF (low risk, but unmitigated)
All write endpoints expect JSON. Combined with `SameSite` cookies, classic
CSRF (HTML form auto-submit) is blocked. But a CORS-misconfigured `fetch`
from a malicious origin could still attempt to ride the user's Supabase
session. Mitigations to consider:
- Require a custom header (e.g. `X-Requested-With: DayMeet`) on write
  endpoints — modern browsers' CORS preflight blocks it from other origins.
- Add an explicit allowlist `Access-Control-Allow-Origin` policy.

### Body size limits
Next.js App Router defaults are reasonable, but we don't explicitly cap
`availability` JSON which can grow with many dates × slots × participants.
If we ever see DB pressure here, cap at the API layer.

### DDoS / volumetric attacks
DayMeet relies on the deployment platform (Vercel/Cloudflare) for L3/L4
DDoS mitigation. No origin-level WAF or bot filtering is configured.
For aggressive abuse:
- Enable Vercel Firewall rules (paid tier).
- Or front the app with Cloudflare (free tier covers L3/L4).

### Logging & alerting
- Server logs go to Vercel's default sink. No structured request IDs.
- No alerting on 401/403 spikes (which would surface brute-force attempts).
- Recommended: ship to a log aggregator (Axiom/Logflare) with alert rules on
  high error rates per IP.

## How we'd respond to incidents

1. **Suspected brute force on `/verify`** → tighten rate limit (lower limit
   in `src/middleware.ts`), audit logs for abusive IPs, consider blocking
   at the firewall level.
2. **Spam event/participant creation** → tighten limits, add CAPTCHA on
   anonymous flows if needed.
3. **Leaked secret** → rotate Supabase service role key + anon key + cookie
   signing secret immediately; force-logout all sessions via Supabase Auth.
4. **Data exposure** → soft-delete records, verify RLS still enforces.
