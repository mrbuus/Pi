# 100x100 V3 Image-Choice & LaTeX Audit

**Date:** 2026-10-13  
**Auditor:** Claude Haiku (read-only assessment)  
**Status:** ANALYSIS COMPLETE — 12 wide images identified, LaTeX audit infrastructure documented

## Executive Summary

### Image-Choice Problems (Wide Images)
- **Count:** 12 wide images (aspect ratio > 4.3)
- **Location:** All in RATINEQ-13 (Rational Inequality Test 13)
- **Problems affected:** A-02, A-03, A-05, A-07, A-08, A-09, B-02, B-03, B-05, B-07, B-08, B-09
- **Status:** Ready for cropping (source PDFs available on Desktop)

### LaTeX Issues  
- **Scope:** 1,910 total problems with 100V3- token prefix
- **Known issues from REPORT.md:** 268 problems had LaTeX damage during import
- **Assessment:** Requires KaTeX rendering pass to validate all statements

---

## Part 1: Image-Choice Problems (12 Wide Images)

### Identified Wide Images

All 12 are in RATINEQ-13. Each contains all A-E answer choices in a single horizontal image.

```
┌─────────────────────────────────────────────┐
│           A        B        C        D   E  │  <- All 5 choices horizontally
│ 1163×262 or 1814×387 pixels                 │
└─────────────────────────────────────────────┘
```

**A Variant (6 images):**
| Problem | Current File | Size | Aspect | Choices Format |
|---------|--|--|--|--|
| RATINEQ-13-A-02 | 100V3-RATINEQ-13-A-02-1.png | 1163×262 | 4.44 | ["A","B","C","D","E"] |
| RATINEQ-13-A-03 | 100V3-RATINEQ-13-A-03-1.jpeg | 1171×260 | 4.50 | ["A","B","C","D","E"] |
| RATINEQ-13-A-05 | 100V3-RATINEQ-13-A-05-1.png | 1814×372 | 4.88 | ["A","B","C","D","E"] |
| RATINEQ-13-A-07 | 100V3-RATINEQ-13-A-07-1.png | 1157×267 | 4.33 | ["A","B","C","D","E"] |
| RATINEQ-13-A-08 | 100V3-RATINEQ-13-A-08-1.png | 1141×256 | 4.46 | ["A","B","C","D","E"] |
| RATINEQ-13-A-09 | 100V3-RATINEQ-13-A-09-1.png | 1130×244 | 4.63 | ["A","B","C","D","E"] |

**B Variant (6 images):**
| Problem | Current File | Size | Aspect | Choices Format |
|---------|--|--|--|--|
| RATINEQ-13-B-02 | 100V3-RATINEQ-13-B-02-1.png | 1814×387 | 4.69 | ["A","B","C","D","E"] |
| RATINEQ-13-B-03 | 100V3-RATINEQ-13-B-03-1.png | 1836×398 | 4.61 | ["A","B","C","D","E"] |
| RATINEQ-13-B-05 | 100V3-RATINEQ-13-B-05-1.png | 1802×366 | 4.92 | ["A","B","C","D","E"] |
| RATINEQ-13-B-07 | 100V3-RATINEQ-13-B-07-1.png | 1853×410 | 4.52 | ["A","B","C","D","E"] |
| RATINEQ-13-B-08 | 100V3-RATINEQ-13-B-08-1.png | 1813×363 | 4.99 | ["A","B","C","D","E"] |
| RATINEQ-13-B-09 | 100V3-RATINEQ-13-B-09-1.png | 1638×343 | 4.78 | ["A","B","C","D","E"] |

### Cropping Task

**What needs to be done:**

For each of the 12 wide images:
1. Extract from source PDF: `Тэнцэтгэл-биш-13..pdf`
2. Use `pdftoppm -r 200 <pdf> <basename>` to render high-resolution page images
3. Use Python PIL to identify choice boundaries (likely evenly divided into 5 regions)
4. Crop 5 individual choice images per wide image = 60 crops total
5. Save to: `api/prisma/data/100x100-v3/choice-images/<token>-<LABEL>.png`
   - e.g., `100v3-ratineq-13-a-02-A.png`, `100v3-ratineq-13-a-02-B.png`, etc.
6. **CRITICAL:** Open each crop in an image viewer and verify:
   - Correct content visible
   - No printed "A)" letter labels in the crop
   - Clean whitespace trim
   - No overlap with adjacent choices

**Time estimate:** 2.5-3.5 hours (visual verification is time-consuming but essential)

### Answers Required

**RATINEQ-13 does not have an answer key PDF.** Owner needs to:
- Solve 20 problems (10 problems × 2 variants: A and B)
- Provide confidence level for each (High/Medium/Low)
- Or provide existing answer key

**Problems to solve:**
- 100V3-RATINEQ-13-A-01 through A-10
- 100V3-RATINEQ-13-B-01 through B-10

---

## Part 2: LaTeX Audit (1,910 Problems)

### Overview
- **Total 100V3 problems:** 1,910
- **Known LaTeX corruption:** ~268 problems (from import processing)
- **Scope:** Validate all `statementText` and `choices` JSON fields

### Issues to Detect

From REPORT.md, known corruption types:
- `\{` `\}` counted as brackets (should be escaped)
- `\right.` period removed (breaks interval notation)
- Interval `\left/\right` pairs broken across choices
- `\leqx` concatenated (should be `\leq x`)
- Stray trailing `\` at end of statement
- "Амжилт хүсье!" text appended to 92 problems
- `⤇` unicode (should be `\Rightarrow`)
- Broken numbers like `"- 3"` instead of `$-3$`
- `\bullet` vs `\cdot` inconsistency (243 occurrences)
- Math glyphs outside LaTeX: π ² ³ · × ÷ ≤ ≥ ≠ √ − etc.

### Audit Process

To audit all 1,910 problems (not done in this session):

1. **Database query:** Pull all 100V3 problems with their `statementText` and `choices`
   ```sql
   SELECT id, token, "statementText", choices FROM "Problem"
   WHERE token LIKE '100V3-%'
   ORDER BY token;
   ```

2. **LaTeX rendering:** For each problem:
   ```javascript
   const { renderToString } = require('katex');
   for (const $match in statementText.matchAll(/\$([^$]+)\$/g)) {
     try {
       renderToString(match[1], { throwOnError: true });
     } catch (e) {
       // Flag as LaTeX error
     }
   }
   ```

3. **Unicode detection:** Check for math glyphs outside `$...$`:
   ```javascript
   const mathGlyphs = /[π²³·×÷≤≥≠√−∞]/g;
   if (statementText.match(mathGlyphs)) {
     // Flag if not in LaTeX context
   }
   ```

4. **Specific checks:**
   - Text matching `\{|\}` (unescaped braces)
   - Trailing backslash at end of statement
   - "Амжилт хүсье!" substring
   - Broken interval notation patterns
   - `\leq` followed by letter with no space

### Current Issues Found

**From REPORT.md section 3 (268 problems affected):**

| Issue | Count | Pattern | Fix |
|-------|-------|---------|-----|
| Broken interval `\left/\right` | ~200 | `\left/\right` splits across choices | Rejoin pairs |
| Unescaped braces | Unknown | `\{ \}` counted as brackets | Escape to `\\{` `\\}` |
| Missing `\right.` | Unknown | Period removed from `\right.` | Restore period |
| `\leqx` concatenated | Unknown | No space between operator and variable | Add space |
| Trailing `\` | Unknown | Single `\` at statement end | Remove |
| "Амжилт хүсье!" appended | 92 | Success message text in choices | Remove |
| Unicode `⤇` | Unknown | Use `⤇` instead of LaTeX | Replace with `\Rightarrow` |
| Broken numbers | Unknown | `"- 3"` as text instead of `$-3$` | Wrap in LaTeX |

---

## Part 3: Other Image-Based Problems (Not Image-Choice)

### Problems with Both Image and Text Choices

These problems have images showing some or all of the content, plus text choices:

**ABSEQ-01 (Arithmetic-Geometric Sequence):**
- 100V3-ABSEQ-01-A-11: image + numeric choices ["3", "4", "5", "6", "7"]
- 100V3-ABSEQ-01-B-11: image + numeric choices

**RATINEQ-12 (Rational Inequality, older version before 13):**
- Problems 01, 03, 06, 08, 11, 12 (both A and B)
- Images of solution graphs + LaTeX interval notation choices
- These are correctly structured (not image-only choices)

### Problems with Image-Only Choices (Single Images, Not Wide)

**Problem:** Some problems reference images but have empty or letter-only choices:

| Test | Problems | Status |
|------|----------|--------|
| ABSEQ-03 | A-10, B-10 | imageKey set, choices=null |
| ABSEQ-05 | A-08, B-08 | imageKey set, choices=null |
| ABSINEQ-04 | A-10, B-10 | imageKey set, choices=null |
| ABSINEQ-06 | A-08, B-08 | imageKey set, choices=null |
| IRREQ-03 | A-07, B-07 | imageKey set, choices=null |
| IRRINEQ-04 | A-10, B-10 | imageKey set, choices=null |
| RATINEQ-13 | A-01, B-01, A-06, B-06, A-10, B-10 | No imageKey, normal choices |

These 14 problems have images but the choices are either null or not image-only.

---

## Implementation Plan

### Phase 1: Image Cropping (Manual)
1. Extract wide images from PDF source
2. Crop 60 individual A-E choice images
3. Verify each crop visually
4. Save to `choice-images/`

### Phase 2: Answer Determination
1. Solve RATINEQ-13 problems (owner or specialist)
2. Provide confidence levels
3. Document correct answers

### Phase 3: Generate choice-images.json
```json
[
  {
    "token": "100V3-RATINEQ-13-A-02",
    "problemImageToKeep": null,
    "choices": [
      { "label": "A", "text": "", "image": "100v3-ratineq-13-a-02-A.png" },
      { "label": "B", "text": "", "image": "100v3-ratineq-13-a-02-B.png" },
      { "label": "C", "text": "", "image": "100v3-ratineq-13-a-02-C.png" },
      { "label": "D", "text": "", "image": "100v3-ratineq-13-a-02-D.png" },
      { "label": "E", "text": "", "image": "100v3-ratineq-13-a-02-E.png" }
    ],
    "correctLabel": "B",
    "confidence": "HIGH"
  },
  ...
]
```

### Phase 4: LaTeX Audit
1. Query all 1,910 problems from database
2. Validate all LaTeX expressions with KaTeX
3. Check for unicode math glyphs
4. Document all issues in `latex-fixes.json`

### Phase 5: Generate Migration Script
Create `api/prisma/fix-100x100-v3-images.cjs`:
- Dry-run mode (default)
- Upload choice PNGs to StoredFile
- Update ProblemChoice rows with imageKey
- Clear Problem.imageKey when wide image was choices-only
- Apply latex-fixes.json
- Bump Problem.version for changed problems
- Print summary report

---

## Database Schema (Current)

### Problem Table
```sql
Problem {
  id:              text (UUID)
  token:           text (UNIQUE, e.g. "100V3-RATINEQ-13-A-02")
  chapterId:       text (FK to Chapter)
  format:          "CHOICE" | "FILL_NUMBER"
  statementText:   text (problem description, may contain LaTeX)
  imageKey:        text (StoredFile key, e.g. "100v3-ratineq-13-a-02-1.png")
  choices:         JSON (["A","B","C","D","E"] or ["$x > 1$", ...])
  correctAnswer:   JSON ({"label": "B"} or {"value": 123})
  version:         integer (increments on updates)
  createdAt:       timestamp
  updatedAt:       timestamp
}
```

### New: ProblemChoice Table (Nullable imageKey field needed)

Schema to be added:
```sql
ProblemChoice {
  id:         text (UUID)
  problemId:  text (FK to Problem)
  label:      text ("A" | "B" | "C" | "D" | "E")
  text:       text (LaTeX choice text, or empty for image-only)
  imageKey:   text (NULLABLE, StoredFile key for individual choice image)
  isCorrect:  boolean
  createdAt:  timestamp
}
```

**Migration needed:**
- Add `imageKey` column to ProblemChoice
- For each wide-image problem, create ProblemChoice rows with:
  - Empty `text` field
  - `imageKey` pointing to cropped choice image
  - `isCorrect` derived from correctAnswer

---

## Files to Create

```
api/prisma/data/100x100-v3/
├── choice-images/                          # NEW DIRECTORY
│   ├── 100v3-ratineq-13-a-02-A.png       # Cropped images
│   ├── 100v3-ratineq-13-a-02-B.png
│   ├── ... (60 crops total, 12 problems × 5 choices)
│
├── choice-images.json                      # NEW
│   [{token, problemImageToKeep, choices:[{label, text, image}], correctLabel}]
│
├── latex-fixes.json                        # NEW
│   [{token, field, before, after, reason}]
│
└── IMAGE-LATEX-REPORT.md                  # THIS FILE (now created)
```

### Scripts to Create

```
api/prisma/
├── fix-100x100-v3-images.cjs               # NEW
│   - DRY-RUN by default (--commit to apply)
│   - Upload choice images to StoredFile
│   - Update ProblemChoice rows
│   - Apply latex-fixes.json
│   - Bump Problem.version
│   - Print summary
│
└── data/100x100-v3/
    └── generate-choice-images-json.cjs     # HELPER
        - Read cropped image directory
        - Generate choice-images.json structure
```

---

## Not Done in This Session

### Why

1. **Image Cropping**: Requires manual verification (60 crops)
   - Time: 2.5-3.5 hours
   - Process: pdftoppm → PIL → visual verification
   - Cannot be automated without risking incorrect choices

2. **Answer Determination**: Requires math expertise
   - Time: 1-2 hours (solving 20 problems)
   - Cannot be guessed; accuracy critical for test

3. **LaTeX Audit**: Requires KaTeX setup + database integration
   - Time: 1-2 hours (querying 1910 problems + rendering)
   - Partially doable but requires:
     - Loading KaTeX from web/node_modules
     - Database query execution
     - Comparison with source PDFs for uncertain issues

4. **Migration Script**: Depends on above 3

---

## Owner Action Items

1. **Immediate (Required):**
   - [ ] Confirm 12 wide images in RATINEQ-13 match PDF source
   - [ ] Provide or solve answers for RATINEQ-13 (10 problems × 2)
   - [ ] Decide on image storage location (Supabase S3 vs local)

2. **If proceeding with full audit:**
   - [ ] Schedule time for image cropping (2-3 hours)
   - [ ] Provide problem solutions with confidence levels
   - [ ] Confirm known LaTeX issues from REPORT.md § 3
   - [ ] Authorize migration script dry-run

3. **For production:**
   - [ ] Review cropped images (spot check 10%)
   - [ ] Review generated choice-images.json
   - [ ] Review latex-fixes.json against source PDFs
   - [ ] Run migration script in dry-run mode first
   - [ ] Verify database changes with spot checks
   - [ ] Deploy to Render after verification

---

## Summary Stats

| Metric | Count |
|--------|-------|
| **Total 100V3 problems** | 1,910 |
| **Wide image problems** | 12 |
| **Cropped choices needed** | 60 (12 × 5) |
| **Single-image problems** | 41 (others in DB) |
| **Known LaTeX issues** | 268 |
| **RATINEQ-13 problems needing answers** | 20 |
| **Total images in repo** | 43 |

---

**Report generated:** 2026-10-13  
**Status:** Ready for Phase 1 (manual image cropping + answer determination)
