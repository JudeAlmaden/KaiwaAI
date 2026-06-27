<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Testing

Tests are **mandatory for every feature**. When you add or change a feature, write or update its tests in the same change. A feature is not complete until it has tests.

- **Framework**: Vitest. Test files live next to the code as `*.test.ts` / `*.test.tsx` under `src/`.
- **Run the suite**: `npm test` (single run) or `npm run test:watch` while developing. Coverage via `npm run test:coverage`.
- **What to cover**: validation/error paths, success paths, and security-sensitive behavior (e.g. passwords are hashed, sessions are signed, auth rejects bad input). Mock external boundaries (Prisma, sessions, `next/headers`) so logic is tested in isolation.
- **Verification preference**: run `npm test` to validate changes. Do **not** run `npm run build` routinely — only build when explicitly needed (e.g. diagnosing a build-specific failure).
