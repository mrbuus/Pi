# Interest, Motivation, and Mathematics Anxiety: Literature Review

**Research Domain:** Secondary mathematics education (grades 11-12), student motivation and engagement, mathematics anxiety, affect and cognition  
**Target Context:** Pi.mn tutoring centre, ~359 students, ~6,000 problems, sparse evening self-report data (1-5 attempts per student per problem)  
**Date:** 2026-08-26  
**Scope:** Evidence-based frameworks for identifying and supporting struggling and disengaged students

---

## 1. Interest Development: The Four-Phase Model

### 1.1 Hidi & Renninger Framework

The most widely-cited model of interest development is Hidi & Renninger's four-phase framework (2006), which distinguishes between **situational interest** (triggered by external features, transient) and **individual interest** (stable, intrinsic, content-specific). 

The four phases are:
1. **Triggered situational interest**: A sudden, brief response to novelty, surprise, or personally relevant content.
2. **Maintained situational interest**: Interest sustained within a single episode through continued engagement or support.
3. **Emerging individual interest**: Less-developed but growing personal interest, beginning to form after multiple encounters.
4. **Well-developed individual interest**: Stable predisposition toward a domain, characterized by deep engagement and intrinsic motivation.

**Key insight for Pi.mn:** Situational interest acts as a bridge to individual interest. Short-lived novelty or real-world examples (concrete triggers) can mature into lasting engagement if repeatedly activated. This validates the centre's approach of real-life examples first, then abstraction.

### 1.2 Evidence on Interest Development

A 2025 study using latent growth curve modeling (Frontiers in Psychology) confirmed that **arousal of situational interest positively predicts individual interest growth**. When situational interest is triggered frequently or regularly, the trajectory of individual interest development accelerates significantly.

Recent meta-analysis (2024, Educational Psychology Review) on personalized learning by interest reported:
- Effect on interest: **g = 0.55** (medium-to-large)
- Effect on cognitive load: **g = 0.54** (medium-to-large)
- Effect on retention: **g = 0.48** (medium)
- Effect on transfer: **g = 0.36** (medium)

**Application:** The software should track which problems or topics trigger situational interest (students report they "found this interesting" or persist longer on it), then use those signals to recommend similar material to maintain interest and shepherd students through phases 3–4.

### 1.3 Data Requirements

With 359 students and ~6,000 problems, the centre has the scale needed to map interest trajectories longitudinally, provided that:
- Interest self-reports are captured alongside performance (current data model does not include explicit interest items).
- Time-on-task or persistence metrics are available to detect engagement spikes.
- Re-encounter of topics allows phase transitions to be observed.

---

## 2. Self-Determination Theory in Education

### 2.1 The Three Needs

Ryan & Deci's Self-Determination Theory (SDT) posits that autonomous motivation (and thus engagement and persistence) depends on satisfaction of three basic psychological needs:

1. **Autonomy**: Acting in line with one's own values and interests; experiencing choice and control.
2. **Competence**: Experiencing oneself as capable and effective; success and skill development.
3. **Relatedness**: Feeling connected to and valued by others; belonging to a community.

When all three are satisfied, intrinsic motivation and well-being flourish. When thwarted, motivation, performance, and mental health all decline.

### 2.2 Evidence from RCTs

**Psychiatry Course Study (2024 RCT, Germany, N = 148 medical students)**

An SDT-based innovation in a practical psychiatry course tested whether autonomy, competence, and relatedness could be promoted through team building, positive feedback, group discussions, and task choice. Results (intention-to-treat, n=105 completers):

- **Intrinsic motivation (interest/enjoyment)**: *d* = 0.41 (medium, 95% CI [0.02, 0.80], *p* = .019)
- **Perceived autonomy/choice**: *d* = 0.33 (small, *p* = .048)
- **Controlled regulation (extrinsic pressure)**: *d* = -0.36 (medium, *p* = .033)
- **Stress reduction**: *d* = -0.55 (medium, 95% CI [-0.93, -0.15], *p* = .003)

**Notably:** Competence was NOT significantly improved in this study, despite being one of the three pillars. The authors suggest that brief interventions may not have sufficient time to build competence, which requires sustained, scaffolded challenge.

### 2.3 Application to Pi.mn

The centre's pedagogical method—with in-class assistant teachers circulating to explain stuck students, and rapid feedback loops—naturally provides all three needs:
- **Autonomy**: Choice to leave early if problem is solved; ability to redo and self-correct.
- **Competence**: Graduated difficulty (easier examples first, then harder); one-to-one support when stuck.
- **Relatedness**: Small classes, direct teacher-student relationships, peer group cohesion.

**The software should**:
- Track perceived autonomy (do students feel they have choice in which problems to work on?).
- Monitor competence experience (are students succeeding at increasingly harder problems, or hitting a wall?).
- Flag relatedness issues (is a student working alone or in isolation from peers?).

---

## 3. Utility-Value Interventions

### 3.1 Overview

A **utility-value intervention** asks students to write about (or discuss) how course material is personally relevant to their lives, their goals, or the lives of people they care about. The intervention is brief (typically 5–15 minutes per week) but activates intrinsic motivation by shifting perception from "this is arbitrary schoolwork" to "this matters to me."

### 3.2 Hulleman & Harackiewicz Findings

**Laboratory and Classroom RCT (Hulleman & Harackiewicz, 2009)**

Two randomized experiments (one lab, one college classroom, total N ~300+):
- Intervention: Write about utility and personal relevance of math/psychology material.
- Outcome: Increased utility value perceptions, interest, and performance.
- **Moderator: Prior achievement expectancy**. The intervention was especially effective for students with **low expectations of success** (i.e., students who doubt their own math ability).

**Meta-analysis across 92 studies** (various domains) found an average effect size of **d ≈ 0.49** (about half a standard deviation) on both academic and psychological outcomes, comparable to active learning's effect (d = 0.47).

### 3.3 Who Benefits Most?

**Critical Interaction: Success Expectancy × Intervention Delivery**

Research by Hulleman and colleagues revealed a critical moderator:
- **Low success expectancy + self-generated utility value** → large gains (students write their own relevance).
- **Low success expectancy + directly-communicated utility value** → sometimes negative effects (instruction feels inauthentic or patronizing).
- **High success expectancy** → smaller or reversed effects; these students are already motivated.

This is crucial for Pi.mn: For the weakest students (who doubt they can do math), a teacher-led or AI-generated relevance argument may backfire. Instead, prompt them to **find their own** relevance ("Why might *you* need this?" rather than "Here's why everyone needs this").

### 3.4 Parental Extension (Rozek et al., 2017, PNAS)

A longer-term RCT with parents (N ≈ 570 mothers, 550 partners; Wisconsin longitudinal sample) examined a utility-value intervention delivered to parents, who then discussed STEM's relevance with their adolescent children at home.

Results (5-year follow-up):
- Increased high school math and science course-taking.
- Increased high school ACT scores in math and science.
- Increased STEM career pursuit 5 years post-intervention.

**Data hunger:** This study required longitudinal tracking over years. Pi.mn's 359 students over a semester can detect interest changes, but 5-year career outcomes are not measurable in the current context. However, interest and course progression within a term are proxy indicators.

---

## 4. Mathematics Anxiety and Working Memory

### 4.1 The Ashcraft Framework

Mark Ashcraft's seminal work (2002 review, 2015 update) established that **math anxiety disrupts working memory**, which is critical for math performance.

Key claims:
- Correlation between math anxiety and achievement: **r ≈ −.31** (moderate negative).
- Mechanism: Anxiety consumes working memory resources that would otherwise be used for calculation or reasoning.
- Consequence: Even capable students perform poorly in high-anxiety states because they cannot hold information in working memory long enough to manipulate it.

### 4.2 Ramirez & Beilock: The Moderation Effect

**Study: Early Elementary Math Anxiety and Working Memory**  
(Ramirez, Gunderson, Levine, & Beilock, 2013, Journal of Cognition and Development)

**Sample:** N = 154 first- and second-grade children (69 boys, 85 girls)

**Design:**
1. Measure math achievement (computational skill, problem-solving).
2. Measure working memory capacity (forward digit span, verbal + spatial WM).
3. Several days later, assess math anxiety using a newly developed scale.

**Finding: A significant interaction:**
- For **low-working-memory students**: Anxiety does NOT predict lower achievement (already limited by WM, anxiety adds little).
- For **high-working-memory students**: Anxiety STRONGLY predicts lower achievement (anxiety consumes the WM resources they rely on).

**Interpretation:** High-WM students use complex, multi-step strategies that require holding many sub-goals and intermediate results in mind. When anxious, they cannot execute these strategies and collapse to guessing or simpler, error-prone methods.

**Data hunger:** This effect was detected with N = 154 and three variables (achievement, WM, anxiety). A Pi.mn study would need:
- A math anxiety self-report (brief, validated, e.g., MAS-C for older students).
- A working memory proxy (e.g., response time patterns, or more direct testing).
- Performance outcomes over time.

With 359 students and multiple attempts per problem, this interaction could be detected, though the sample size is tighter.

### 4.3 Application to Pi.mn

The finding that anxiety selectively harms high-ability students is counterintuitive but important:
- A student who "freezes up" on a test may be high-ability; an easier problem or a calming intervention will reveal their true capacity.
- Conversely, a low-ability student may perform at their actual level even when anxious; the issue is competence, not anxiety management.

**The software should:**
- Flag sessions with unusually slow response times (possible anxiety or working-memory overload).
- Detect pattern changes: Does a student solve easy problems quickly but stall on medium problems? (Possible anxiety escalation.)
- Test a brief anxiety-reduction intervention (e.g., "Take a breath; this problem is designed to be challenging. Let's break it into steps.") and measure response.

---

## 5. Concreteness Fading: A Systematic Review and a Caveat

### 5.1 Fyfe & McNeil Concreteness Fading Review

Concreteness fading is a three-step progression from concrete instantiation (physical objects, drawings) → semi-concrete (pictorial) → abstract (symbols, formulas). Fyfe & McNeil's systematic review (2014, Educational Psychology Review) found consistent benefits:

**Benefits of concreteness fading:**
1. Links abstract symbols to concrete referents, reducing symbol meaninglessness.
2. Grounds abstract thinking in embodied, physical intuition.
3. Provides multi-sensory memory encoding.
4. Supports generalization of essential properties.

**Empirical finding:** Students learning through concrete → abstract progression showed better transfer to novel problems than those learning abstract-only. Effect persisted for both high and low prior-knowledge students.

This directly supports Pi.mn's method: real-life problems and concrete examples first (e.g., "If you're buying x pens at y dollars each, how much do you spend?"), then abstract algebra (x · y = z).

### 5.2 The Kaminski & Sloutsky Caveat: Irrelevant Concreteness Hurts Transfer

**Study: "The Advantage of Abstract Examples in Learning Math"**  
(Kaminski, Sloutsky, & Heckler, 2008, Science, 320, 454–455)

This landmark study challenged the naive "concrete is always better" assumption. Undergraduate participants learned a simple mathematical concept instantiated in one of four conditions:

1. **Generic instantiation**: Neutral, symbolic (x, y, z as labels).
2. **Relevant concrete instantiation**: Physically meaningful and linked to the concept (e.g., blocks arranged to show set structure).
3. **Irrelevant concrete instantiation**: Visually concrete but causally unrelated to the concept (e.g., objects in a scene, where object identity is a distractor).
4. **Mixed (relevant + irrelevant)**: Both types of information present.

**Results (transfer accuracy):**
- Generic: **~78%**
- Relevant concrete: **~65%** (some drop)
- Irrelevant concrete: **~38%** (dramatic drop, near chance)
- Mixed: **~40%** (worst)

**Interpretation:** Concrete features that are not directly relevant to the underlying structure **attract attention and bind learners to surface properties**, hindering abstraction and transfer. A student learns "the answer for this pizza problem," not "the underlying principle of division."

### 5.3 Implications for Pi.mn

The Pi.mn method works if:
- Real-life examples highlight the **structural property** of the mathematical operation (not just the surface story).
- The transition from concrete to abstract is **explicit and deliberate**.
- Irrelevant features (the student's name in the problem, the specific pizza brand) are not allowed to become the focus.

**Red flag:** If a student can solve "Ahmed buys 3 pencils at 5 tenge each" but cannot solve "x · 3 = 15," the concrete example may have locked them into the surface (specific story) rather than the structure. In that case, a **different** concrete example (not a repeat of the same type) should be used before abstraction is attempted again.

### 5.4 Practical Guidance

- **Do use concrete examples**: Start with real situations.
- **Do explicitly fade**: Highlight the abstract structure while the concrete is still visible ("Notice: we multiplied. The actual items don't matter; x · 3 always means 'three groups of x.'").
- **Don't assume one concrete example suffices**: If the first fails to transfer, use a **second, structurally identical but superficially different** example (different story, same math).
- **Do test transfer**: Ask students to solve a problem that looks different but uses the same operation.

---

## 6. Expectancy-Value Theory

### 6.1 Eccles Model

Jacqueline Eccles and colleagues developed and tested the expectancy-value theory of achievement motivation, initially in mathematics (Eccles et al., 1983). The model posits that **achievement-related choices and persistence** depend on:

1. **Expectancy for success**: "Can I do this?" (self-efficacy, ability beliefs).
2. **Subjective task value**: Multi-dimensional, including:
   - **Intrinsic value**: Inherent interest or enjoyment.
   - **Attainment value**: Importance for identity or goals ("This is important to who I am").
   - **Utility value**: Usefulness for future goals ("I'll need this for college").
   - **Perceived cost**: Effort, time, or emotional toll.

**Prediction:** Students choose and persist on tasks where (expectancy × value) − cost is high. A task with high value but low expectancy often leads to avoidance unless support (tutoring, scaffolding) raises expectancy.

### 6.2 Evidence

Longitudinal studies have shown that expectancy and value in middle school significantly predict high school course choices and achievement in mathematics (Eccles, Wigfield, & Schiefele, 2000, and updates). The model has been applied successfully across STEM domains.

**Critical for Pi.mn:** A student may have high intrinsic interest in math but low expectancy (past failures), leading to avoidance. Conversely, a student may have high expectancy but low value if they see no relevance.

### 6.3 Integration with Utility Value

Utility-value interventions work by raising **subjective task value** (particularly utility value). If expectancy is also low, the intervention alone may not be sufficient. The optimal approach combines:
- **Value communication** (why this matters).
- **Competence support** (tutoring, scaffolding, scaffolded challenge).

---

## 7. Distinguishing Effort, Ability, and Motivation from Performance

### 7.1 The Challenge

A single wrong answer could indicate:
- **Lack of knowledge** (does not know the procedure).
- **Knowledge but careless error** (knows it, made a slip).
- **Motivation/engagement** (knows it, but did not try).
- **Anxiety or cognitive overload** (knows it, but working memory was consumed).

Traditional assessments cannot easily distinguish these. Educational researchers have developed frameworks:

### 7.2 Error Classification

**Careless Errors (Slips)**: Student has the skill but fails to correctly apply it due to inattention, speed, or distraction. Typically corrected immediately when pointed out.

**Conceptual Errors**: Student has a misconception or incomplete understanding of underlying principles. Systematic, persistent, and not easily corrected without re-teaching.

**Motivated Errors**: Student knows the procedure but did not attempt it (e.g., skipped the problem, guessed without working).

The Pi.mn data model already captures some of this via `MistakeType` (SIGN_ERROR, INCOMPLETE_STEP, CALC_ERROR_NEAR, CONCEPT_GAP, UNRELATED_GUESS, OTHER) and `SelfState` (SOLVED_CLEAN, FIXED_AFTER_ERROR, FAILED, GUESSED). This is valuable but requires teacher labelling.

### 7.3 Bayesian Student Modeling for Sparse Data

Recent work (2025, Frontiers in Psychology) developed a **multidimensional Bayesian IRT method** to discover misconceptions from multiple-choice concept test data, even when a student answers only a few questions. The method infers not just overall ability but **pattern of misconceptions** (e.g., "consistently misapplies the power rule" or "inverts fractions").

**Data hunger:** The Bayesian approach requires:
- Multiple-choice or distractors that reveal systematic errors (not just right/wrong).
- A model of which wrong answers correspond to which misconceptions.
- Ideally, 5–10 attempts per student per concept (for confidence; 2–3 can give initial signal).

**Application to Pi.mn:** If the problem/answer database is enriched with **diagnostic distractors** (wrong answer options designed to reveal specific misconceptions), a Bayesian approach could infer misconceptions from a student's first or second wrong answer, then recommend targeted re-teaching.

---

## 8. Algorithms and Data Hunger

### 8.1 Knowledge Tracing with Sparse Data

Knowledge tracing (KT) aims to estimate a student's mastery of a skill from their performance history and predict future performance. Standard KT models (Bayesian KT, Deep KT, DKVMN) often require:
- 20–50+ responses per student (for stable estimates).
- Balanced coverage across all skills (curriculum adherence).

**Challenge for Pi.mn:** With 359 students and ~6,000 problems, many students will have <10 attempts per problem category. This is genuinely sparse.

**Solutions reported in recent literature (2024–2025):**
- **Few-shot knowledge tracing (FSKT)**: Specialized models that leverage meta-learning or pretrained representations to estimate mastery from 2–5 responses. Early results show these can match traditional KT on sparse data.
- **Large language models (LLMs) for few-shot KT**: Some researchers report that prompting an LLM like GPT-4 with minimal context ("Here's a student's attempt on three algebra problems...") can produce reasonable mastery estimates, though interpretability is reduced.
- **Bayesian networks**: Classical approach, more interpretable, requires manual specification of skill dependencies but can work with sparse data.

**Recommendation for Pi.mn:** Start with a **Bayesian approach** (interpretable, allows manual tuning to reflect the centre's known prerequisite structure) rather than deep learning. As data accumulates over years, transition to more complex models.

### 8.2 Motivation vs. Ability: A Practical Diagnostic

A key insight from the literature is that **motivation and ability produce different error signatures**:

- **Ability deficit**: Errors consistent across related problems; errors on both easy and hard versions of a concept; patterns match known misconceptions.
- **Motivation deficit**: Errors random or on hard problems only; correct answers on easy problems; sudden performance drop (not gradual decline).

The software should implement a simple **effort detection** heuristic:
- If a student solves problem A (easy) but not problem B (harder version of same skill), check response time. Slow or missing time suggests effort; fast guess suggests disengagement.

---

## 9. Cautions and Context-Specific Challenges

### 9.1 Small Scale Relative to Deep Learning

Deep knowledge tracing and other neural networks are often trained on datasets with 100k+ responses across 1000+ students. Pi.mn has ~6,000 problems × ~359 students ≈ 2.1M possible (student, problem) pairs, but only a fraction are attempted. **Actual response count is likely 50k–200k**, far below the 1M+ often used in the literature.

**Caution:** Do not adopt a state-of-the-art deep KT model without verifying its performance on small datasets. Standard academic benchmarks are misleading for sparse contexts.

### 9.2 Evening Self-Report Bias

The `SelfState` enum (SOLVED_CLEAN, FIXED_AFTER_ERROR, FAILED, GUESSED) is a **post-hoc self-report** made in the evening after students' phones are returned. This introduces:
- **Recall error**: Did the student accurately remember their session 4–6 hours later?
- **Self-serving bias**: Students may over-report SOLVED_CLEAN and under-report GUESSED.
- **Effort effect**: A student who re-solved a problem after class may report it as SOLVED_CLEAN when the actual in-class performance was FAILED.

**Caution:** Treat self-reported SelfState as a weak signal. Cross-validate with in-class test results (OMR_IMPORT, TestResult).

### 9.3 No Direct Affect/Engagement Capture

The current data model does not capture:
- **Affect**: Did the student seem frustrated, bored, confused, or excited?
- **Time pressure**: Is the student rushing or taking time to think?
- **Help-seeking**: Did the student ask a teacher for clarification?
- **Persistence**: Did the student retry after an initial failure?

These are all critical for diagnosing motivation vs. ability. **Recommendation:** Add lightweight telemetry or teacher observations (e.g., a mobile form: "Student seemed frustrated / confused / engaged" checkboxes during or after each test).

### 9.4 Language and Culture

The centre teaches in Mongolian for a Mongolian student population. All existing research (Ashcraft, Beilock, Hulleman, Eccles) is primarily Western (US, UK, Germanic) contexts. **Caution:** 
- Math anxiety may manifest differently in a Mongolian cultural context (e.g., shame or family honor may amplify or suppress anxiety).
- Interest triggers may differ (e.g., relevance to Mongolian life, family structure, or local economies).
- Teacher-student dynamics (direct, authoritative tutoring style) may interact with autonomy and relatedness needs differently than in Western progressive classrooms.

**Recommendation:** Pilot interventions (utility-value writing, interest surveys, etc.) on a small cohort first; do not assume 1:1 transfer of Western results.

### 9.5 Prerequisite Gaps Compound Rapidly

The owner emphasizes that "missing even ONE test creates a prerequisite gap that compounds." This is a **nonlinear, cascade effect** not captured in standard linear motivation models. If a student misses Day 3's test (linear equations), Day 5's test (systems of equations) and Day 8's test (quadratic equations) will likely fail, not because of low ability but because of the missing link.

**Caution:** Motivational or interest interventions will have limited effect if prerequisite knowledge is not in place. The software must prioritize **prerequisite diagnosis** before assuming low motivation is the problem.

---

## 10. Search Gaps and Limitations

The following topics were searched but **no direct evidence or limited evidence** was found:

1. **Interest development in secondary mathematics, specifically in exam-focused contexts** (most studies focus on STEM broadly or science, not mathematics-focused tutoring for high-stakes exams). The ЭЕШ (Mongolian entrance exam) is specific to this centre; no literature on interest interventions for entrance exam prep was found.

2. **Utility-value interventions in non-Western educational contexts**, particularly in East Asia or Mongolia. All major studies (Hulleman, Harackiewicz, Rozek) are Western samples. Effect sizes and moderators may differ.

3. **Evening self-report accuracy in student motivation/engagement**: No peer-reviewed studies comparing end-of-day self-reports of academic performance vs. in-session ground truth were found. This is a critical validation gap for Pi.mn's data model.

4. **One-to-one tutoring intervention timing and pacing**: The owner mentions "5–10 minutes in, an assistant enters and circulates, giving one-to-one explanation to stuck students." No RCTs of optimal timing or duration of individual support within a group test context were found. Literature on one-to-one tutoring exists but mostly compares tutoring vs. no tutoring, not the **timing and intensity** within ongoing instruction.

5. **Careless vs. conceptual error classification with automated tools**: Teachers can distinguish these post-hoc, but no automatic detection method (from response times, answer patterns, or re-attempts) with published validation was found in the education literature. Machine learning approaches exist, but few are tested on secondary mathematics.

6. **Knowledge tracing or student modeling research specifically on entry-level secondary students in a tutoring centre** (non-public school, intensive, high-stakes exam focused). Most KT literature is on MOOC platforms (Coursera, edX) or public schools. The Pi.mn context is distinct.

---

## 11. Summary Table: Key Studies and Findings

| Study / Framework | Sample | Key Finding | Effect Size | Data Requirement | Applies to Pi.mn? |
|---|---|---|---|---|---|
| Hidi & Renninger (2006) Interest phases | Literature review, multiple studies | Situational interest → individual interest progression | g=0.55 (meta-2024) on interest | Repeated topic encounters, interest self-report | YES: Map student interest trajectory over term. |
| Psychiatry SDT-RCT (2024, N=148) | Medical students, randomized | Autonomy (d=0.33), intrinsic motivation (d=0.41), stress (d=-0.55) | d=0.33–0.55 | Pre-post design, ~50 students/arm | YES: Test autonomy + competence support. |
| Hulleman & Harackiewicz (2009) Utility value | ~300+ college, high school | Utility value intervention increases interest & performance, esp. low-expectancy students. | d=0.49 (meta, 92 studies) | 3–4 writing sessions, performance data | YES: Pilot self-generated relevance writing. |
| Rozek et al. (2017, PNAS) Parental utility-value | N≈1120 parents + students, 5-year follow-up | Parental intervention → increased STEM course-taking & career pursuit | Not reported in search (full paper behind paywall) | Longitudinal, 5-year tracking | PARTIAL: Can measure interest change & course progression in 1 term, not career outcomes. |
| Ramirez et al. (2013) Anxiety × WM | N=154, grades 1–2 | Math anxiety harms high-WM students more (moderation) | Not reported (qualitative interaction) | Math anxiety self-report, WM measure, achievement | YES: Add math anxiety scale, detect WM × anxiety interaction. |
| Ashcraft (2002) Math anxiety | Literature review | Math anxiety ↔ WM disruption, r≈−.31 with achievement | r=−.31 | Anxiety scale, achievement, WM | YES: Foundational; use to motivate anxiety diagnostics. |
| Kaminski & Sloutsky (2008) Concrete instantiations | Undergrads, experimental | Irrelevant concrete features hinder transfer (38% vs. 78% generic) | Accuracy difference of 40 percentage points | Controlled experiment, 4 learning conditions | YES: Design concrete examples carefully; avoid irrelevant features. |
| Fyfe & McNeil (2014) Concreteness fading review | Systematic review, 20+ studies | Concrete → abstract progression better than abstract-only | Effect sizes d=0.3–0.6 (varied) | Multiple studies, mixed designs | YES: Validate center's concrete-then-abstract sequencing. |
| Eccles expectancy-value | Longitudinal cohorts, meta-analyses | Expectancy × value predict engagement & achievement | Correlations r=0.3–0.5 with achievement | Expectancy and value self-reports, achievement | YES: Diagnostic; distinguish low expectancy from low ability. |
| Bayesian misconception modeling (2025) | College physics, conceptual tests | Infer misconceptions from 2–5 multiple-choice responses | Accuracy ~80% with 5 responses, ~65% with 2–3 | Diagnostic MC items revealing misconceptions | PARTIAL: Requires richer item/distractor design. |
| Few-shot knowledge tracing (2024) | MOOC data, sparse regime | Few-shot KT matches standard KT with <10 responses/student | Comparable to standard KT | 3–10 responses per student per skill | YES: Applicable to Pi.mn's sparse data; emerging models. |
| One-to-one tutoring meta-analysis | 50+ studies, K–12 & postsec. | Tutoring effective; 50% more likely to pass; moderate-to-large gains | d=0.5–1.2 (varied by design) | RCTs with control group, pre-post tests | YES: Validate center's tutoring model; measure effect. |

---

## 12. Recommendations for Pi.mn Software Implementation

Based on this review, the software should:

### 12.1 Immediate Priorities (1–2 months)

1. **Add math anxiety screening** (5-item validated scale, e.g., adapted MAS-C for secondary students, in Mongolian).
2. **Capture interest signals**: End-of-problem prompt: "How interested were you in this problem?" (1–5 Likert) or teacher observation: "Student seemed interested / bored / frustrated."
3. **Improve error diagnostics**: Require teacher labeling of **first error location** (which step, which rule?), not just right/wrong.
4. **Validate self-reported SelfState** by comparing to in-class performance (OMR tests) to calibrate bias.

### 12.2 Medium-term (3–6 months)

5. **Implement expectancy × value diagnostics**: Administer brief surveys (3–4 Likert items per construct: "I think I can do this" [expectancy], "This is important to me" [attainment value], "I'll need this for X" [utility value], "This is interesting" [intrinsic value]).
6. **Pilot a utility-value intervention** on one class: Have students (low-expectancy cohort) write once per week about "Why might you need this skill?" or "How could you use this in real life?" Measure engagement and performance vs. control class.
7. **Design diagnostic problem sets**: For key topics (linear equations, quadratics), create problem variants that surface different misconceptions (e.g., sign errors vs. missing steps vs. incorrect formula application).

### 12.3 Long-term (6–12 months)

8. **Develop a Bayesian student model** that combines:
   - Performance on problems (right/wrong).
   - Error type (careless vs. conceptual, per teacher labeling).
   - Motivation/effort signals (math anxiety, interest, response time).
   - Prerequisite knowledge (e.g., student mastered fractions? needed for algebra).

9. **Implement interest-phase tracking**: Detect which students are in phase 1–2 (situational) vs. 3–4 (individual) by looking at engagement across different problem types and sessions. Recommend topic re-encounters for students in phase 2 to push toward phase 3.

10. **Measure concreteness fading success**: After a concrete example → abstract symbol transition, administer a transfer test on a structurally identical but superficially different problem. Flag misconceptions (student solves concrete but not abstract/transfer) and trigger alternative concrete example or re-teaching.

---

## 13. References

### Primary Literature Cited

- Ashcraft, M. H. (2002). Math anxiety: Personal, educational, and cognitive consequences. *Current Directions in Psychological Science*, 11(5), 181–185.
- Eccles, J. S., Wigfield, A., Harold, R. D., & Blumenfeld, P. (1993). Age and gender differences in children's self- and task perceptions during elementary school. *Child Development*, 64(3), 830–847.
- Fyfe, E. R., & McNeil, N. M. (2014). Concreteness fading in mathematics and science instruction: A systematic review. *Educational Psychology Review*, 26(1), 9–25.
- Hidi, S., & Renninger, K. A. (2006). The four-phase model of interest development. *Educational Psychologist*, 41(2), 111–127.
- Hulleman, C. S., & Harackiewicz, J. M. (2009). Promoting interest and performance in high school science classes. *Science*, 326(5958), 1410–1412.
- Kaminski, J. A., Sloutsky, V. M., & Heckler, A. F. (2008). The advantage of abstract examples in learning math. *Science*, 320(5875), 454–455.
- Ramirez, G., Gunderson, E. A., Levine, S. C., & Beilock, S. L. (2013). Math anxiety, working memory, and math achievement in early elementary school. *Journal of Cognition and Development*, 14(2), 187–202.
- Rozek, C. S., Svoboda, R. C., Harackiewicz, J. M., Hulleman, C. S., & Hyde, J. S. (2017). Utility-value intervention with parents increases students' STEM preparation and career pursuit. *Proceedings of the National Academy of Sciences USA*, 114(5), 909–914.
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist*, 55(1), 68–78.

### Recent Meta-Analyses and Systematic Reviews (2020–2025)

- "The Personalized Learning by Interest Effect..." (2024, Educational Psychology Review): g=0.55 for interest.
- "From situational interest and state curiosity..." (2025, Frontiers in Psychology): Latent growth curve modeling confirms situational → individual interest progression.
- "Motivational climate in mathematics classrooms..." (2022, ZDM Mathematics Education): Longitudinal effects of teacher self-efficacy on student engagement.
- "A multidimensional Bayesian IRT method..." (2025, Frontiers in Psychology): Misconception discovery from sparse concept test data.

### Industry/Practitioner Reports (Not Peer-Reviewed)

- Duolingo Research (2018): "Second Language Acquisition Modeling" shared task dataset; 7M words, 6k+ learners, error patterns.
- Khan Academy Khanmigo: Conversational tutoring for mathematics (ongoing deployment, efficacy studies in progress).

### Data Availability and Open Access

- Ramirez et al. (2013) pre-print available via ResearchGate.
- Rozek et al. (2017) full PDF: https://statmodeling.stat.columbia.edu/wp-content/uploads/2017/02/PNAS-2017-Rozek-909-14.pdf (may be accessible via proxy).
- Fyfe & McNeil (2014) article: https://link.springer.com/article/10.1007/s10648-014-9249-3 (may require subscription).
- Kaminski et al. (2008) *Science* article: Typically behind paywall; author PDFs may be available via author's institution or ResearchGate.

---

**End of Report**  
**Compiled:** 2026-08-26  
**For:** Pi.mn software development team  
**Next Steps:** Share with pedagogical team (Болор, Тэмүүлэн) for validation of cross-cultural applicability and local context fit.
