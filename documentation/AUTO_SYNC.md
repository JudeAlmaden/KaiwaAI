# API key auto-sync

On first login / onboarding, Gemini keys can sync from the server into localStorage so BYOK works on a new device without re-entry.

## Flow

1. User hits `/onboarding` (`OnboardingClient.tsx`).
2. If `hasAnyKey()` already → go to `/chat`.
3. Else `GET /api/settings/server-key?sync=true`.
4. Keys found → decrypt, `addKey()` each locally, then `/chat`.
5. None → manual key entry; optional checkbox POSTs to `/api/settings/server-key` (AES-256-GCM at rest).

## Key files

- `src/app/(app)/onboarding/OnboardingClient.tsx`
- `src/app/api/settings/server-key/route.ts`
- `src/lib/api-keys.ts`
