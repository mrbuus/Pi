# Public homepage design QA

Scope: `/Users/mr.buus/Intern/pi.mnv2` only. The original project is unchanged.

The public subject picker offers Mathematics and Social Studies. Historical SAT
API/database records remain available to existing backend/admin workflows; the
public picker ignores those windows and does not mutate the returned array.

## Source checks completed

- Targeted `SubjectPicker.tsx` ESLint passed.
- Actual React server rendering with `[SAT, MATH, SOCIAL_STUDIES]` returned only
  two checkboxes and both public subject names. No SAT markup appeared and the
  input array was unchanged.
- `.runtime/interface-public-policy-source-qa.cjs` passed: legacy/missing/false
  online opt-in remains locked; explicit true and an open eligible subject allows
  online selection; classroom selection remains available; closed/classroom-only
  policy still applies.
- `.runtime/landing-motion-qa.cjs` syntax check passed.

## Browser checks

Final production verification passed all 19 checks at 05:34 UTC on 2026-10-07,
against the root agent's fresh build containing the hero clipping correction.
The script uses installed Google Chrome headless and bundled Playwright against
`http://localhost:3381`:

```sh
node .runtime/landing-motion-qa.cjs
```

Passed checks:

- Light theme at 365px and 1440px: headings, hero actions, exactly two subject
  cards, no visible SAT, no document overflow, no browser page errors.
- Mobile after the full interaction flow: hero scrollLeft stays zero and the
  title retains its 18px inset; programmatically setting hero.scrollLeft=18
  cannot move the clipped section. The fresh hero screenshot was visually
  inspected and shows the corrected inset.
- Actual SVG geometry changes from mouse drag, keyboard arrows and Home; reset
  restores the initial geometry; all three named shape selectors work.
- Mobile Chrome CDP touch: horizontal touch rotates geometry; vertical touch
  scrolls the page without rotating; the stage retains `touch-action: pan-y`.
- Mobile drawer: section and registration links, Escape, focus restoration, and
  section-link closure all work.
- Native centre disclosure reveals the preserved online-class policy. Both
  tuition tiers display their annual prices without overflow.
- Simulated book-request 503 shows loading and an error with a retry. Removing
  the interception and retrying retrieves real books, then real chapter content,
  at both widths. No fake book/chapter response is used on the successful path.
- Registration: online option disabled, buyer option enabled, classroom wizard
  exposes exactly Mathematics and Social Studies; no SAT option or overflow.
- Dark theme at both widths: no overflow or visible SAT; navy section heading
  retains light foreground; centre disclosure and tuition prices work.
- Reduced motion: no running homepage CSS animation, manual rotation remains
  usable. Separate browser-clock advancement simulates ten minutes and verifies
  automatic shape change plus focused, offscreen and reduced-motion guards.
- Existing synthetic student: homepage link goes to `/app/student`; navigating
  there preserves its token and role. The token is never printed.

The browser-clock check simulates elapsed time; it does not wait ten real minutes.
The solid component's compiled interval callback was separately checked for the
exact 600000ms interval and dragging, hidden-document and resumed-idle guards.
The script creates no user or business data and does not restart any server.

## Evidence

The corrected issue: after scrolling down the page, Chrome scrolling the Cube
button into view moved the `overflow: hidden` hero horizontally by 19px. Its title
moved from x=18px to x=-1px while the document width still stayed 365px. Mouse,
keyboard and touch geometry interaction alone from the top did not cause it.
A live `overflow: clip` override prevented this native programmatic scrolling
(hero scrollLeft=0, title x=18px) while still cropping the decorative orbit.
The runner now checks hero scrollLeft as well as document width, the mobile
title's 18px inset after the complete interaction flow, and that setting
hero.scrollLeft=18 cannot move a clipped hero. The corrected final build passed
these checks and regenerated every screenshot listed below.

Machine-readable results: `.runtime/landing-motion-qa-results.json`.

Screenshots under `.runtime/`:

- `landing-365-hero.png`, `landing-1440-hero.png`: light theme hero viewports.
- `landing-365.png`, `landing-1440.png`: light theme full pages.
- `landing-dark-365-hero.png`, `landing-dark-1440-hero.png`: dark theme heroes.
- `landing-dark-365.png`, `landing-dark-1440.png`: dark theme full pages.
- `landing-1440-subjects.png`, `landing-1440-centre-info.png`: legible section
  viewports, with matching `landing-dark-1440-*` screenshots.
- `landing-register-365.png`, `landing-register-1440.png`: classroom wizard.

## Technical references

The input model follows [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events).
Vertical browser panning is preserved with [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action).
Viewport suppression uses the [MDN Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).
Motion preferences use [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).
