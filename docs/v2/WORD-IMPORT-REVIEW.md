# DOCX equation preview review (local v2 only)

## Delivered contract

- `POST /api/document-import/preview`: authenticated multipart request with exactly one `file` field. Only `ADMIN` and `TEACHER_PLUS` roles. Missing/bad content returns 400; existing JWT/role guards enforce 401/403. Multer bounds uploads to 10 MiB.
- Response: `{version:1, filename, blocks, warnings, equationCount, canAutoImport:false}`. A block has stable document-local `id`, `kind`, converted `text`, exact `sourceXml`, and review warnings. Tables additionally have `rows[row][cell][block]`. Source XML is returned as escaped text in the UI, never executed.
- `/app/import` uploads to that real API, renders MathText, displays warnings and inspectable source, and keeps table/paragraph order. Responsive table overflow and a back link are provided.
- Teacher manually selects one prompt paragraph, 2–4 distinct choice paragraphs, one correct choice, and an existing active chapter. Warning-bearing paragraphs cannot be selected; inherited merged-cell/container warnings also block selection. Explicit review confirmation enables persistent save or optional local draft download. Multi-paragraph questions and figures need manual editing/attachment through existing authoring tools.
- `POST /api/document-import/confirm`: `{previewToken, chapterId, confirmed:true, warningsAcknowledged:true, mapping:{promptId,choiceIds,correctChoiceId}}`. Returns only `{problemId,duplicate}`; no correct answer, choice correctness, source, or preview token. Strict route DTO validation rejects unknown fields. Same admin/teacher+ guard covers both routes.
- Server signs a 30-minute preview using a per-process random HMAC key, binding preview ID, uploader ID, source SHA-256 and expiry. Converted paragraph text/warnings stay server-side; confirmation accepts IDs only, not altered client text. Cache has at most 32 previews and a 64 MiB text budget, prunes expired previews and evicts oldest previews. Restart/eviction/another instance requires a fresh upload and fails closed.
- Server validates exactly one prompt, 2–4 unique distinct choice blocks, a correct ID belonging to choices, nonempty bounded text, and no selected-block warnings. User ownership, role, preview signature, expiry and chapter/book active status are checked. Figure warnings cannot be overridden by the review checkbox.
- Save reuses `ContentService.createProblem` inside a Prisma transaction, including nested `ProblemChoice` rows and an audit record. A deterministic globally unique `Problem.token` derived from uploader + source hash + chapter + canonical mapping provides durable retry idempotency, including concurrent retries and fresh previews. Audit stores hash/block IDs, not book contents or answer keys. Full books are never guessed or split automatically; one reviewed question is saved per confirmation. No schema changes required.
- Exact XML retains unsupported equations, including objects whose equation content is inside drawings. Therefore `equationCount` means directly traversed OMML equations, not every OMML in fallback/drawing markup.

## Wiring owned by root

Import `DocumentImportModule` from `./document-import/document-import.module` and include it in `AppModule.imports`. Add `/app/import` to admin/teacher+ navigation. Declare direct dependencies `jszip` ^3.10.1 and `saxes` ^5.0.1 (currently available through exceljs) in API manifest/lock. No Prisma migration required.

## Bounded and fail-closed behavior

ZIP central directory is inspected before inflation: reject ZIP64/multi-disk/encrypted entries, unsafe paths, more than 2,000 entries, or advertised total expansion over 40 MiB. Only the document XML is inflated, through a stream stopped at 12 MiB. XML rejects DTD/entity declarations, invalid UTF-8, over 128 nesting levels and over 250,000 nodes. A 32 MiB cumulative source-copy budget bounds preview expansion from nested structures. Equation source is bounded at 20,000 characters; over 10,000 encountered equations receive review warnings. KaTeX conversion runs with `trust:false`, `strict:error`, `throwOnError:true`, `maxExpand:1000`. Legacy `.doc`, Word `~$` locks, missing Word parts, malformed XML and malformed ZIP fail closed.

Supported deterministic conversions: stacked/no-bar fractions, square/nth roots, superscript/subscript/combined scripts, sum/product/integral and supported multiple integrals, hats/bars/vectors and selected accents, delimiters, matrix rows, equation arrays, functions and limits. Selected Unicode symbols become LaTeX; Cyrillic text becomes `\\text{...}` and circled 1–20 becomes `\\text{\\textcircled{...}}`; recognized combining accents become explicit LaTeX accent commands. Other structures and KaTeX-incompatible symbols preserve original XML and require review. Generic boxes, phantom/group/bar objects and selected structural properties are deliberately not guessed. Headers, footers, endnotes and footnotes receive an omitted-parts warning. Images/legacy Equation objects become manual attachment placeholders. Revision/field markup, list numbering, text indices and merged cells receive review warnings. Exact source XML preserves original dollar text; display uses a fullwidth dollar and warns to prevent delimiter misinterpretation.

Known limitations: this is a conservative preview converter, not a full OOXML roundtrip or Word layout renderer. Styles, font choices, complete OMML property behavior and Word pagination are not reproduced. Manual review is always required even where KaTeX succeeds. No original source DOCX or image is copied into v2 fixtures. API preview has temporary process-memory state only; only explicit confirmed questions persist. Different backend instances need sticky routing or a fresh preview.

## Real local source checks

Read-only inspections under `/Users/mr.buus/Desktop/Books`, excluding `~$` lock files. Statistics only are retained here. Blocks include flattened table descendants, but the first six selected sources primarily used paragraph content. Two additional answer-table sources were inspected read-only.

| Source | Preview blocks | Traversed OMML | Unsupported math | Figure/object placeholders |
|---|---:|---:|---:|---:|
| 300x300 V2/Бином-задаргаа-2.docx | 111 | 84 | 0 | 24 |
| 300x300 V2/Вектор-1.docx | 129 | 70 | 6 | 58 |
| 300x300 V2/Матриц-1-d.docx | 128 | 86 | 0 | 36 |
| 300x300 V2/Геометр-прогресс-2-d.docx | 105 | 72 | 0 | 30 |
| 200x200 V3/Интеграл-5.tulgah.docx | 47 | 30 | 0 | 14 |
| 200x200 V3/Интеграл-9.tulgah.docx | 106 | 72 | 0 | 30 |
| 300x300 V2/300x300-тестийн-хариу.docx | 1151 | 161 | 0 | 0 |
| 200x200 V3/200x200-ХАРИУ-В .docx | 1901 | 300 | 0 | 0 |

The two answer-table sources contain 57 and 101 ordered tables respectively; the 300x300 answer source also surfaces 21 merged-cell warnings. No answers are automatically attached to questions or exposed through student routes. All have a mandatory manual-mapping warning; integral-5 has one special-container warning. Namespace-aware independent Python XML inventory confirmed fractions/roots in binomial material, vectors/matrices in vector material, 100 matrix objects in matrix-1, and 36/30 n-ary operators in integral-5/9. Independent XML inventory sees 136 OMML nodes in vector-1, while preview traverses 70 because fallback/drawing objects are intentionally represented by attachment warnings. Many books put circled question numbers and prose inside math and retain image/legacy fallbacks. Circled labels are rendered in text mode, combining underlines/accents are preserved, and Word-only lastRenderedPageBreak pagination markers are ignored without dropping math. This reduced unsupported conversion warnings to zero in five sources and six conservative generic-box warnings in vector-1. Exact source XML remains inspectable; figure/object placeholders still require manual review. These counts demonstrate usable converted portions and real review work remaining; they do not establish full-book fidelity.

Repeat locally, without a database:

```sh
cd /Users/mr.buus/Intern/pi.mnv2/api
node src/document-import/inspect-docx.cjs '/absolute/path/to/math-book.docx'
./node_modules/.bin/jest --runInBand document-import
```

## Verification

Sixteen tests across four suites passed, covering parser fixtures, controller guards, persistent service behavior and a real Nest HTTP pipeline. Parser coverage: exact fraction/root/script/integral/vector/matrix conversions and KaTeX validity; exact unsupported-math XML retention; ordered table cells and image warnings; legacy/bad ZIP/bad XML/DTD/depth/expansion rejection; namespace handling; role authorization for every Role; missing/malformed controller uploads. Fixtures are generated in memory and contain no private source material.

Web TypeScript no-emit and targeted ESLint passed after the persistent UI changes. API targeted ESLint passed. API no-emit reaches shared-workspace tests constructor and assignments/generated-Prisma-field errors; no document-import compile errors were reported. HTTP tests use a test authentication guard while preserving the actual role guard, multipart interceptor and DTO pipeline. They verify 401/403 role denial, rejection of injected answer payload/unconfirmed input, safe response shape, valid single-file upload and 413 for oversized upload. Persistent-service tests verify same/fresh preview retry idempotency, canonical field-order independence, source token tamper/theft rejection, expiry, malformed mapping, figure blocking and transaction failure propagation. Actual localhost persistence verification passed on 2026-10-07 against the isolated v2 database: concurrent retries created exactly one question, two choices, one correct flag and one audit; forced audit failure rolled the transaction back; student/malformed mapping were denied; confirmation returned no answer key. The guarded runner below removed its own synthetic rows afterward. Live authenticated browser upload, mobile screenshots and production deployment remain unverified.

## Authoritative references

- [Microsoft OfficeMath overview](https://devblogs.microsoft.com/math-in-office/officemath/) explains OfficeMath object structure and the distinction between OMML and linear math notation.
- [Microsoft OMML Math namespace](https://learn.microsoft.com/en-ca/dotnet/api/documentformat.openxml.math?view=openxml-2.20.0) identifies fraction, n-ary, radical and related serialized object names.
- [Microsoft Radical object](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.math.radical?view=openxml-3.0.1) documents `m:rad`, degree and base children.
- [Microsoft Word linear equations](https://support.microsoft.com/en-us/word/linear-format-equations-using-unicodemath-and-latex-in-word) distinguishes Word UnicodeMath/LaTeX input from stored structured math. This tool converts stored OMML instead of assuming DOCX text is already LaTeX.

## Explicit localhost-only persistence verifier

```sh
cd /Users/mr.buus/Intern/pi.mnv2/api
DOCX_TEST_DATABASE_URL='<explicit localhost v2 test URL>' node src/document-import/verify-confirmation.cjs
```

The runner does not load `.env` or default `DATABASE_URL`. It refuses non-local hosts and databases without `v2` in the name. It generates synthetic Word content and isolated teacher/chapter rows, checks concurrent confirmation against the real DB, verifies two choices/exactly one correct choice/one audit, and forces audit failure inside a real transaction to verify rollback. Finally it removes only its generated rows. No Books file is copied or imported by this runner.
