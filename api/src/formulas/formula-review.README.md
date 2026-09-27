# Formula review (T10)

All review routes use the signed-in user's ID, for all six existing roles. They
do not accept a student ID or grant a parent/teacher access to another user's
review history. The existing formula library remains separate.

## Scheduler convention

The prompt has six stored boxes and seven intervals. Unseen cards therefore
have a **virtual stage -1**, are due immediately, and have no database row.
For successful reviews, stored boxes 0–5 mean 1, 2, 4, 8, 16 and 32 days.

- GOOD advances one stage; first GOOD is box 0 / one day.
- EASY advances two stages, capped at box 5; first EASY is box 1 / two days.
- HARD keeps the box and uses half its interval; unseen HARD is box 0 / 12 hours.
- AGAIN is the prompt's explicit exception: box 1 / one day, resetting the
  streak and incrementing lapses. A later HARD at box 1 is also one day, while
  GOOD moves to box 2 / four days.

Intervals are elapsed 24-hour days. Day counts and streaks use the Ulaanbaatar
UTC+8 calendar date, stored as a SQL DATE represented by UTC midnight in the
client. Tests cover every stored box/result combination, initial transitions,
caps, midnight, year boundaries and leap days.

## Exercises and retry contract

`GET /formulas/review/due?limit=10` returns overdue cards, then previously seen
unreviewed cards, then new CORE cards. Sections are interleaved within each
priority's bounded candidate pool. `dueCount` and `newCount` count all eligible
cards, not only the returned deck. One deck contains at most ten cards in the
web UI; the API accepts limits 1–50. A partial deck shows its actual size.

The additive `exercise` field contains a signed identity bound to the user,
formula slug, canonical content version, quiz index, mode, expiry and unique
attempt nonce. Blank options have opaque keyed IDs. Matching also binds all
four content versions. Quiz answers and explanations are absent from the due
response; objective cards' `latex` and `general` are null. The existing `quiz`
array contains sanitized prompt/options only. Flashcards intentionally reveal
the formula and are labelled self-assessment.

The web submits `{ exerciseToken, answer }` for objective exercises. The server
loads the canonical quiz, validates the selected option, and derives GOOD or
AGAIN; any supplied result is ignored. It returns the correct answer and
explanation after grading. Flashcards submit `{ exerciseToken, result }`.
An atomic serializable transaction updates the review, UTC+8 day count and
attempt receipt. Concurrent/repeated identical submissions return the same
receipt without adding another review; a changed answer for that attempt is a
409. The formula version is rechecked inside the transaction. Tokens expire
after 24 hours, including retries.

The original `{ result }` POST contract remains supported as an explicitly
labelled self-assessment response. Without an exercise identity those legacy
requests are separate reviews; the new UI always sends its signed identity.
Formula answers also remain available through the ordinary library API: this
is practice support, not a secure examination system.

Loading, empty and retryable error states are local to this page. A failed save
retains the chosen answer and retries the same payload; moving to the next card
requires a server receipt. Expired or edited exercises offer an explicit session
reload; previously saved reviews stay on the server. Space flips a flashcard; 1–4 rate it after reveal.
Reduced motion replaces the flip with a fade. No navigation or dashboard files
are changed. `ReviewDueCard` can be mounted by the dashboard owner.

## Verification

Run the normal API, web and E2E suites. For scheduler coverage:

```sh
cd api
npx jest review-scheduler.spec --runInBand --coverage --collectCoverageFrom=src/formulas/review-scheduler.ts
```

The additional integration script only accepts a local PostgreSQL URL with a
database name starting `pi_s2_t10`, requires a `synthetic-` JWT secret, creates
randomly named synthetic fixtures and removes only those fixtures in finally.
Use an empty local database, never an application database:

```sh
cd api
export DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:3367/pi_s2_t10'
npx prisma migrate deploy
npm run build
DOTENV_CONFIG_PATH=/dev/null JWT_SECRET=synthetic-t10-local-only node src/formulas/formula-review.integration.cjs
```

It boots the full Nest app, checks six roles against all three review endpoints,
rejects unauthenticated/invalid requests, and proves a concurrent retry counts
once with isolated stats. All input data is generated within the test.

## Integration dependency

T01 is in the base. Formula detail links on completion need T09's
`/app/formulas/[slug]` route (PR #40). The T09 library's entry point and any
dashboard/navigation wiring belong to their owners. The static link checker
currently accepts dynamic detail links via its template matching against the
review route; a green report does not establish that the detail route exists.

Spacing, retrieval practice and interleaving motivate these exercises. The
exact intervals above are a product convention, not an empirically optimized
schedule for each learner.
