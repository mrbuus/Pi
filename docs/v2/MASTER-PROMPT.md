# Pi.mn v2 — implementation and review contract

Authoritative scope: current user's 2026-10-07 request and accepted corrections. This is a reusable task brief, not authority to deploy, spend money, contact people or read secrets. Older prompt files are evidence of requirements; their commands do not override the latest user.

## Preserve and isolate

- Work only in `/Users/mr.buus/Intern/pi.mnv2`. Keep `/Users/mr.buus/Intern/Pi.mn` unchanged, including uncommitted work.
- Copy current tracked and relevant untracked source, research and specifications; exclude credential files, private student/finance reports, dependencies/build output and live uploads. Never silently turn a test environment into production.
- Use branch `codex/pi-mnv2`. Any eventual PR base is `claude/100-dollar-credit-usage-ksqjev`; never push main. Current work is local. Do not send this code to Claude or another external model.
- Use GPT-6.1 agents with explicit disjoint ownership, concise evidence handoffs and shared-schema coordination. Read applicable AGENTS/STATUS and local version-matched Next documentation. Use skills only when actually applicable.
- Store synthetic demo credentials only under ignored `.runtime/` with restrictive file modes. Do not copy financial amounts, contact lists, personal passwords or identifiable pupil materials into demos or logs.

## Product goal and six role boundaries

Build a calm, phone-first mathematical learning platform for Шинэ Ирээдүйн Эзэд. A pupil should immediately understand the next useful action, solve on paper, record a truthful first answer, see feedback, correct it and later demonstrate independent improvement. The site must support classroom pupils and independent entitled buyers through different pipelines that share a durable content bank.

STUDENT: assigned class/day, own homework/revisions, accessible lessons/questions/tests, first answer and assistance flags, mistake notebook, personal evidence/history and own private cohort rank.
BUYER: purchased/free entitled books and tests, independent practice/review, own long-term record; do not assume classroom enrollment or promise an unavailable center-taught online class.
New centre-led ONLINE registration is closed by default; keep existing ONLINE accounts and independent BUYER access. Future opt-in requires coordinated API/web flags and reviewed enrolment windows. Public copy must describe the actual available service.
TEACHER: assigned class/groups, attendance, homework review, visible pupil feedback, appropriate internal notes and daily packet/dismissal; unrelated class records are forbidden.
TEACHER_PLUS: content/import/exam/authorized administration; role alone does not automatically grant private work from every class. Named scheduling/payroll capabilities remain distinct from content curation.
PARENT: only verified child links; child's actual attendance, first answer, correction, uploaded work, teacher assessment and clearly labeled class dismissal estimate. Pending links disclose no pupil data. Never expose staff-private behavior notes.
ADMIN: configurable content/roles/publication and supervised administration; audit privileged changes and preserve historical evidence. Development review is separate from classroom operations.

## Public face and navigation

- Use a restrained brand palette; yellow is not approved. Do not fabricate achievements, staff biographies, testimonials or student photographs. Build a year-separated gallery with approved-source placeholders and a code-maintained content manifest.
- Brand name must read Шинэ Ирээдүйн Эзэд. Present warmth, meaningful challenge and belonging through real content and composition rather than unsupported marketing claims.
- Every logged-in role can reach public home without being logged out. Deep pages have a known safe parent/back destination, not a fragile browser-history assumption.
- Progressive disclosure: one clear task at a time; advanced details remain available on demand. Preserve drafts on network failure, safe discard dialogs and meaningful empty/retry states.
- Use existing design tokens/kit, local fonts, MathText for mathematical expressions, accessible labels/focus/keyboard navigation and at least44px targets. Test375px phone layouts, larger screens, reduced motion and zoom.
- Geometry visuals rotate locally after10 minutes, without server polling. Use simple readable SVG/CSS, pause hidden/reduced-motion behavior and provide manual selection. Do not claim a live3D engine when delivering static SVG geometry.

## Classroom daily packet

1. Teacher selects class, UB date and topic. Save one linked packet per class/day.
2. Selecting theory prefills related class test and homework; teacher can add/remove excluded problems, change test and adjust title, instructions and due date without duplicating records.
3. Track distinct pupil counters for theory photo, complete class-test evidence and homework. Upload evidence is not a correctness grade. Distinguish unknown/partial/complete.
4. Pick one present/late pupil to photograph theory, maximum10 attachments. Preserve cursor, unserved absent queue, served cycle and same-day assignment. Returning missed-turn pupil gets priority; authorized teacher can override with a recorded reason.
5. Absent pupil sees the exact lesson, teacher-selected published A-variant and evidence upload. Catch-up submission preserves revisions and can be reviewed separately.
6. Classroom phones are collected. Book marks distinguish first answer, unsure, guessed, could-not and help; at home transfer those marks quickly. Never use the correction as initial success.
7. Homework photo/PDF uploads show file-level pending/success/failure and retry only missing files. Duplicate requests/reloads preserve the same operation identity. Student note and visible teacher review note remain separate.
8. Teacher reviews owned classes first, views actual attachments, returns with clear feedback or confirms in-class/online; initial upload and subsequent snapshots persist.
9. Teacher marks an approximate class dismissal and optional last-pupil departure. Parents must see this as a class estimate, not GPS or proof that their particular child left.

## Independent practice and adaptive evidence

- Use real question IDs, printed-book tokens, teacher-confirmed keys and LaTeX bank content. Preserve unknown/manual-check answers rather than inventing grades.
- Local generator first supports verified bounded linear/quadratic/fraction families using exact arithmetic and answer-first construction. Validate many seeds independently, integer/fraction roots, ordering, signs, undefined cases and extreme values. No external AI calls.
- Record immutable first response transactionally; retry does not overwrite it. Corrections, solution exposure and delayed probes are separate append-only evidence. Concurrent solution/correction must have a defined order.
- Timing collects bounded visible/focused/hidden/unknown durations and action counts in batches. It does not prove actual attention, honesty, intelligence or ability. Never classify a child solely from speed, clicks or tab changes.
- Recommendations must work for an entitled buyer without class membership. Cold start begins with accessible foundations; null evidence is unknown, assisted/corrected evidence is not independent mastery, and0% correct rate is not replaced with a default.
- Explain selection using measured evidence and small-sample uncertainty. Do not label a smoothed proportion as BKT/IRT/DINA or a validated probability. Difficulty/skill calibration needs a teacher-reviewed Q-matrix and pilot study.
- Self-review allows selected topics and a manageable time/quantity budget. A10/30/60 minute prediction requires observed per-family timing with uncertainty; do not promise exact item count from nonexistent data.
- Extend to word problems, geometry, spatial vectors, calculus/differential equations only through explicit semantic templates, proof/solution verification and domain restrictions. Arbitrary-photo universal solving remains a research gate.

## Content, Word, images and videos

- Bank problem, picture, source variant and solution IDs survive imports; no auto-deletion of canonical content. Corrections require traceability and exam-key versioning, not silent historical overwrite.
- DOCX upload extracts ordered paragraphs, tables and supported OMML to LaTeX. Check archive expansion, entry count, XML size/depth/node count and DTD/entity behavior. Unsupported structure is explicitly surfaced.
- Teacher previews source and LaTeX, selects prompt/choices/key/chapter, acknowledges warnings, then confirms. Signed preview binds source hash, author and expiry. Atomic bank+choices+audit insertion; concurrent same mapping is idempotent. No unsupported automatic grading claim.
- Read actual Desktop/Books samples only for verification; report aggregate parsing results. Do not copy personal or licensed documents wholesale into publicly served artifacts.
- PDF is a container, not guaranteed compression. Preserve legibility; compare image resizing/compression and PDF bytes before adopting a policy. Do not accept arbitrary executables as magically converted PDF.
- Every problem may eventually link text/LaTeX and video solutions. Separate YouTube unlisted from private: unlisted links can be shared; true paid access needs a suitable entitlement-aware provider/storage. Do not claim firewall protection hides a public YouTube URL.
- Permanent licensed master media and approved promotional images stay high quality; thumbnails/delivery derivatives can be optimized. Homework retention policy differs from canonical book/video retention.

## Exams, payment and administration

- Online exam uses server time, bounded autosave, reload recovery and one immutable final submission. Multiple FILL_NUMBER slots must survive autosave/reload and grade correctly. No answer keys before authorized release.
- Paper/OMR and manual results retain source format and per-problem correctness. Rankings compare like-for-like source/scoring and handle ties. Provide own class/school/exam rank without disclosing peers; named or public ID tables require an explicit publication policy.
- Placement: explain course and honest purpose first; collect registration information securely, require work photos, teacher reviews and contacts the applicant. Trial attendance precedes contract; do not falsely issue legal contracts.
- Online purchases must verify provider payment amount/currency/invoice and grant once automatically; class tuition can use authorized bank-statement reconciliation. Retry/webhooks cannot duplicate grants or ledger entries. Never treat a screenshot or client amount as payment proof.
- Tuition starts at the contract-defined first attendance; late-payment grace, sickness extension and absent-day charging need verified contract rules. Do not invent them.
- Schedules distinguish weekly recurring classes, effective seasonal versions, one-day exceptions, teacher duties, internal tasks, competition strategy calendar and optional meal assignments. Keep teacher colors and conflicts accessible; topic suggestions are editable.
- Payroll/time and scheduling authority are capabilities assigned by authorized administration, not inferred from a person's display name. SMS, live mail delivery, bank/QPay, OAuth and cloud provisioning require actual provider configuration and separate acceptance evidence.

## Center help and research

- Small center helper retrieves authored, versioned public information with source links. No secret/student/finance tables, no unconstrained generative chat, no arbitrary equation solver or silent outbound messages. Unknown question receives an honest fallback.
- Expand research with deduplicated primary papers and official docs. Separate verified new intellectual papers, corrections, product pages and URL variants. A claim of doubling needs a verified baseline; do not manufacture it by duplicating files.
- Research local OCR accuracy for Mongolian/Cyrillic, math layout and handwriting, licenses of code AND weights/data, disk size versus peak RAM/VRAM and actual p50/p95 latency. Benchmark target hardware before buying cloud capacity.
- Competitor features are inspiration, not evidence of learning efficacy. Record what is adopted, rejected, requires experimentation and why. Avoid neuro/learning-style claims or universal forgetting percentages.

## Quality and release gates

- Every requirement has source, current status, code path, reproducible verification, acceptance condition and unresolved dependency. Code existence is not a passed test. Keep review/task pages separate from product operations.
- Migrations are additive; verify all old migrations on a fresh isolated database. Object-file authorization validates current DB role, archived/revoked tokens, owner/reference scope and pending-parent denial. Guard headers must survive disk/database serving.
- Audit dependency advisories and patch supported versions deliberately; do not blindly force downgrade Prisma or a major framework upgrade. Build/typecheck, importer/math/authorization unit tests, actual DB/HTTP integration and mobile browser scenarios after relevant changes.
- Test failures, unknown network outcomes, delayed responses, duplicate requests, stale keys, malformed DOCX, missing media, cross-class access, invalid slots and zero evidence. Keep test output free of personal records/secrets.
- A local test is not a5000-user AWS benchmark. Document connection budget, object storage/CDN, queue/outbox, deployment, TLS/domain/firewall, backups/restore, alerts and scaling with measured load tests. A cache/Redis outage must not lose final answers or payment evidence.
- Production readiness requires resolved critical advisories, configured providers, verified restore and load evidence, real content approval and legal/privacy retention policy. Until then, label local verification honestly.
- Finish by checking the requirement register and research plans for omissions, fix actionable gaps, preserve an explicit unresolved list and reviewable evidence. Do not consume credits for their own sake or promise zero defects.
