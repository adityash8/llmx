# LLMX implementation plan

## Correction plan — 2026-10-13

Require HTTPS at the shared public URL boundary and on redirect hops. Save individual excluded page keys with rules and reapply both to refreshed content. Charge the durable per-user usage RPC before GitHub diff reads. Prove HTTP rejection, redirect downgrade, exclusion persistence/URL normalization, quota replay and storage-error behavior with `npm test`; then run `npm run typecheck`, `npm run lint`, `npm run build`, a browser flow where available, and `git diff --check`. The unapplied schema may be amended; no live SQL is run here.

Preserve the blue/white LLMX identity. Build the complete anonymous sitemap/manual import → include OR / exclude rules → bounded validation → Markdown llms.txt and companion JSON → copy/download/install loop. The current v2 proposal supersedes the PRD's robots-style default; keep that only as a labelled auxiliary export. No ranking score claims.

Implement verified Supabase private project persistence/deletion and domain proof, server-side GitHub OAuth/PR export with actual API responses and diff, and configured refresh adapters. Cron/billing are phase 2; CLI/Action is low-priority future scope. Existing integrations must fail honestly without credentials.

Proof commands, before editing: `npm run typecheck`, `npm run lint`, `npm test` (generator/validator agreement, include/exclude, fetch private addresses/redirects/response limits, persistence ownership and integration errors), `npm run build`, production HTTP/browser core-flow smoke including manual import, rule preview, safe export, empty/error recovery and mobile layout. No production credits, deployment, commits or CI edits. Parent performs independent review and cloud setup.

Canonical dirty clone inspected read-only: only untracked guidance files, no product changes to incorporate. No repo AGENTS.md or lessons found.

## Delivery and story coverage

- US-001: Domain and explicit sitemap URL import, robots.txt sitemap discovery, nested sitemap parsing (depth 2, at most 20 maps, 500 pages), and manual URL fallback are implemented. Import reports truncation. Detection starts with one valid sitemap candidate; multiple independent sitemap roots are not merged.
- US-002: Presets, custom path/glob/bounded regex rules, include OR semantics, exclusions, individual URL selection, count, and live preview are implemented.
- US-003: A bounded 20-page, four-concurrent check reports HTTP failures, redirects/canonicals, robots.txt/noindex conflicts, duplicate URLs, and sitemap lastmod warnings with suggested fixes. Safe mode exports checked pages without access or canonical conflicts; unchecked pages are omitted. Dates are hints, not proof that content is fresh.
- US-004: The advertised `llms.txt` follows the llmstxt.org v2 Markdown proposal: H1, optional summary, H2 and linked page lists. Companion JSON and robots-like rules are separately labelled nonstandard auxiliary exports. Generator output passes the public format validator.
- US-005: Copy/download and install instructions work without sign-in. Private users can connect GitHub, load the existing repository file as a side-by-side diff, and request a branch and PR. A real PR link is returned only after GitHub confirms it. Domain proof and provider configuration gate the PR path. No claim of publication is made.
- US-006: Scheduled and deploy-triggered refresh are Stage 2 and inactive. Manual sitemap refresh exists for saved projects.
- US-007: Public domain or pasted-file validator shows a bounded sample report and a rerunnable share link. Its percentage means checked links without errors, not AI ranking or readiness. No persistent result, leaderboard, or badge exists in this pilot.
- US-008: CLI and GitHub Action are low-priority future scope in the PRD; neither is shipped.
- US-009: File or DNS TXT domain proof is implemented and must have been checked within 30 days to create a PR.
- US-010: Owner-scoped confirmed deletion immediately removes the private project row and its stored URLs, rules, proof and generated content. Files already downloaded and GitHub PRs remain outside LLMX.

Billing and cron are phase 2. The inherited demo-identity checkout and webhook routes were removed; `/pricing` now describes the free pilot. The inherited Webflow asset API could not install a root `llms.txt`; its publish route returns a truthful 501 until a supported install path exists.

## Verification

- `npm run typecheck` — exit 0.
- `npm run lint` — exit 0, 12 warnings in inherited Webflow/auth/support files, 0 errors.
- `npm test` — exit 0, 7 passing tests: proposal output and rules, SSRF private targets, sitemap bounds, validation safe mode, GitHub provider failure, token encryption, and rejection of caller-controlled project ownership fields.
- `npm run build` — exit 0; Next.js 15.5.27 compiled and generated 24 static pages. `node -p "require('./node_modules/next/package.json').version"` returned `15.5.27` after lockfile-matching npm install.
- Production HTTP smoke with `npm run start -- -p 4177` and local Node fetch: `/`, `/generate`, `/validator`, `/install`, `/pricing` returned 200; `/api/generate` rejected a loopback URL with 400; pasted public validation returned 200; private project save without Supabase configuration returned 503.
- Browser screenshot blocked in the managed macOS sandbox: Playwright Chromium installation succeeded under `/private/tmp`, but launch failed with `MachPortRendezvousServer ... Permission denied (1100)`. Parent should run the browser core flow and mobile layout outside this sandbox. No claim of browser pass is made.

## External release gates

Correction check (2026-10-13): `npm test` passed 10/10, including HTTPS target/redirect rejection, normalized saved page exclusions with text rules, and quota replay/storage errors. `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` exited 0. Lint reported the same 12 warnings in inherited files and no errors. No LLMX browser command exists in `package.json`; parent owns the outside-sandbox browser and provider flows. Public contract changes: public fetch and project-domain proof now require HTTPS; `POST /api/projects` accepts optional `excludedUrls`, stored as `excluded_urls` in the unapplied SQL schema and honored by refresh/export/PR content; `GET /api/projects/:id/pr` now consumes one durable daily integration unit before any GitHub call and returns 429 at the limit or 503 on quota storage error. Parent must apply the amended SQL before private save testing. No live SQL or provider calls were made.

Parent applies `supabase/llmx.sql` to the shared project, then sets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. Private ownership, RLS, deletion, and atomic per-user integration usage limits require a live Supabase check after migration; local tests cannot prove the remote policies.

GitHub PR export additionally requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `LLMX_APP_URL`, and a server-only 64-character hex `LLMX_TOKEN_ENCRYPTION_KEY`, with the OAuth callback configured as `${LLMX_APP_URL}/api/github/callback`. The user must sign in, save a project, publish file or DNS proof, connect GitHub, and grant repository access. No production provider credits or cloud operations were used here.

The anonymous fetch limiter is process-local; each request also has bounded input, DNS checks, pinned public IP, redirect count, response size, map depth, concurrency, and deadline. Distributed rate limiting remains a release consideration for high-traffic public deployment.

## Files and public API

Changed or added: `package.json`, `package-lock.json`, `docs/IMPLEMENTATION.md`, `tests/core.test.ts`, `supabase/llmx.sql`; `src/lib/{api,github,llms-txt,projects,rules,safe-fetch,sitemap,supabase,supabase-server,validation,config,webflow}.ts`; `src/components/{navigation,project-tools,workspace}.tsx`; app pages for home, generator, validator, install, dashboard, sign-up, pricing, and Webflow site copy; API routes for generator, sitemap, public validator, projects, domain verification, refresh, GitHub OAuth/PR, and Webflow publish. Removed inherited checkout, verify-session, Stripe webhook, and payment-success routes.

Public API additions: `POST /api/sitemap`, `POST /api/generate`, `POST /api/validate-public`; `GET/POST /api/projects`, `GET/DELETE /api/projects/:id`, `POST /api/projects/:id/verify`, `POST /api/projects/:id/refresh`, `GET/POST /api/projects/:id/pr`, `GET /api/github/authorize`, `GET /api/github/callback`. `POST /api/webflow/publish` now returns 501. Removed `POST /api/checkout`, `POST /api/verify-session`, `POST /api/stripe/webhook`. Parent should inspect these contract changes before release.
