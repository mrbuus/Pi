# T15: public math offline reader

`/offline` is a public, mobile-first reader for formula snapshots that the device
has already received. It is not an offline exam or authenticated app shell.
RegisterSW is already mounted by the owner's root layout; this PR does not edit
that protected file. InstallPrompt may also be placed in Profile by the owner.
No new API is called by the offline UI (Cache Storage only), so there is no new
HTTP mock contract. The synthetic service-worker QA uses localhost fixture data.

## Deliberate privacy boundary

The task's broad `/formulas*` stale-while-revalidate example is unsafe for
`/formulas/my`, review/progress and problem text. Instead the worker recognizes
only the configured API base and catalog/section/single-slug GET routes. It
returns the actual network response unchanged, preserving authorization and
error semantics. It refreshes a separate public math projection in the background.
The `/offline` reader serves that last saved projection immediately, including
without login. Only global mathematical content is saved: slug, title, TeX,
explanation, conditions, derivation, mnemonic, worked examples, common mistakes,
exam tip and saved time. No headers, tokens, original response, student IDs,
performance, quiz, practice problems or query strings are persisted.

This public snapshot design is intentionally narrower than replaying complete
API responses. The existing API helper rejects calls while navigator is offline;
users therefore use `/offline`. T09 should link to it on network failure. T01
provides the catalog responses after its PR is integrated; list responses are
arrays. A list refresh does not discard a previously saved detailed explanation.

The worker precaches only generic `/offline` HTML and its allowlisted JS/CSS/font
assets, falling back to the existing `/offline.html` during older deployments.
It never caches authenticated navigation HTML or RSC data. Limits: 500 public
formula records and 160 static assets (plus the two fallbacks). Browser quota or
privacy mode may prevent caching; online use still works. Users can clear the
math snapshots from the reader. Cache Storage is best effort, not a backup.

## Update/install lifecycle

Only production + secure contexts register a worker. API origin comes from the
build's NEXT_PUBLIC_API_URL, carried in the worker script URL; only HTTPS or
loopback HTTP are allowed. A waiting worker shows the existing sonner toaster's
update action. No automatic skipWaiting or page reload interrupts an exam. An
explicit click activates and reloads that tab; other open tabs may finish their
current work. Never unregister all workers or clear another application's cache.

Android/desktop uses beforeinstallprompt. Dismissal does not claim installation.
iOS Safari receives Share / Add to Home Screen instructions. Installed standalone
mode hides the prompt. Existing server-rendered logo icons were exported as local
192/512/maskable PNG assets; the legacy icon routes still work.

## Evidence and limits

- Baseline c47f63c: 567 API tests; 17 browser tests pass/1 mobile-only diagnostic
  skipped in desktop; web build passes. No API code/schema changed in T15.
- `node --test web/tests/pwa.test.cjs`: 13 tests (privacy, routes, errors, quota
  bounds, update gating, list/detail refresh and offline fallback).
- After incorporating the owner’s 9c0cbb0 base: API 578/578; TypeScript/build
  pass; full lint 0 errors/92 warnings (one additional warning belongs to the
  base’s test-builder page, no warning in new PWA files).
- New `e2e/tests/pwa.spec.ts`: cached/empty/search/clear and install dismissal,
  375px + 1280px. Full suite: 21 passed, 1 desktop-only skip.
- Real Chrome service worker, synthetic localhost API: public projection only,
  91 public cached resources, full offline reload, generic fallback from an exam
  URL, rendered KaTeX, zero page errors, zero horizontal overflow. QA assets:
  `web/docs/qa/pwa-s2`.
- Lighthouse 13.5.0 on the local empty reader: performance 91, accessibility 100,
  best practices 100, SEO 100. This is one local run, not a production SLA.
  Modern Lighthouse removed the PWA category. Performance/accessibility/etc.
  are separate from installability; do not invent a PWA score. Real-device
  iPhone/Android home-screen installation remains a manual acceptance step.
- The owner's global offline banner can overlay content at the viewport bottom.
  No protected layout/banner file changed; final cross-app accessibility review
  should include this known integration limitation.

Sources checked 2026-09-27: bundled Next 16.2.9 docs `progressive-web-apps.md`,
metadata `manifest.md`; [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps),
[MDN service-worker caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching),
[Chrome Lighthouse PWA removal notice](https://developer.chrome.com/docs/lighthouse/pwa/pwa-cross-browser).
