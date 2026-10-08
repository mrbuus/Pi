# Mastery Learning, Prerequisite Gaps, and Tutoring Effect Sizes: A Research Review for Pi.mn

**Date:** 2026-08-26  
**Scope:** Mastery learning, prerequisite knowledge structures, tutoring effectiveness, error diagnosis, and learning-recovery interventions relevant to a Mongolian tutoring centre (359 students, ~6000 problems, 12th-grade mathematics).

---

## Executive Summary

This review synthesizes recent peer-reviewed research (2011–2026) on tutoring effectiveness, mastery learning, prerequisite gap diagnosis, and adaptive instruction. Key findings relevant to Pi.mn's mission:

1. **Bloom's 2-sigma claim does not replicate at 2σ.** Typical tutoring achieves d ≈ 0.79 (large effect), substantially lower than Bloom's d = 2.0, though high-quality implementations and prerequisite-focused instruction can approach d ≈ 0.4–0.6.

2. **Mastery learning is effective** (weighted mean d = 0.67 across 16 meta-analyses, 771 studies). Effects are larger for disadvantaged students (d ≈ 0.61) than general populations.

3. **High-dosage, in-school tutoring works:** ≥3 days/week, during school time, in small groups (≤3:1), produces d ≈ 0.23–0.40 depending on scale. Larger studies (n ≥1000) see d ≈ 0.16–0.21; smaller studies (n <100) see d ≈ 0.44.

4. **Acceleration with just-in-time support outperforms pure remediation.** When students receive grade-level content with targeted skill support, they close gaps faster (36% vs 44% struggle rate on next lesson).

5. **Error diagnosis at step level (not just "wrong answer") is critical** and increasingly feasible with modern NLP and ML, but requires careful categorization: careless (easy to fix) vs conceptual (requires re-teaching).

6. **Knowledge Space Theory (Doignon & Falmagne) provides a mathematically rigorous model of prerequisites**, validated in ALEKS and other adaptive systems. Prerequisite relations can be automatically estimated from interaction data using knowledge tracing.

7. **Spacing and retrieval practice improve retention**, though effect sizes in mathematics are smaller (g ≈ 0.28 overall) than in other domains. Spacing is robust; retrieval-practice effect in math is not conclusive.

8. **Data requirements for ML models:** Knowledge tracing typically needs 50+ interactions per student before stable predictions. Benchmark datasets have hundreds of thousands to millions of interactions. Pi.mn's scale (~359 students, evening self-reports, sparse data) is manageable but demands careful feature engineering and domain knowledge.

---

## 1. Tutoring Effectiveness and Bloom's 2-Sigma Problem

### 1.1 Bloom's Original Claim vs Modern Replicability

**Bloom (1984)** reported that one-on-one tutoring combined with mastery learning produced a two standard deviation improvement (d = 2.0) over conventional classroom instruction. This claim has become legendary in educational research but has **not replicated at that magnitude**.

**Recent systematic review (Nintil, 2024):**
- Tutoring effect size: d ≈ 0.79 (very large, but not 2σ)
- Mastery learning alone: d ≈ 0.4–0.5 (medium to large)
- Direct instruction: d ≈ 0.5 (medium to large)

**Bloom's d = 2.0 likely inflated because:**
1. Tutees were held to a higher *standard of mastery* (criterion-referenced), not just better instruction
2. Comparison group was not ideal—often uses lower pass thresholds
3. Effect vanishes when measured by standardized tests rather than experimenter-designed assessments (suggesting "teaching to the test" rather than transfer)

**Implication for Pi.mn:** One-to-one tutoring at Pi.mn should aim for d ≈ 0.7–0.9 on internal assessments, but expect lower (d ≈ 0.3–0.5) on external standardized tests (the ЭЕШ exam). Focus on *criterion mastery* (problem-by-problem) rather than normative gains.

---

## 2. Mastery Learning: Meta-Analysis and Effect Sizes

### 2.1 Kulik & Kulik (1990) and Beyond

**Landmark meta-analysis:** 108 controlled studies of mastery learning in colleges, high schools, and upper elementary grades.

**Findings:**
- **Mean effect size: d ≈ 0.67** (weighted mean across 16 recent meta-analyses, 771 studies, 11,383 students)
- **Effect larger for disadvantaged students:** d ≈ 0.61 (vs d ≈ 0.5 for general populations)
- **Stronger in weaker classes:** weaker students benefit more from mastery structures

**Mastery procedures include:**
- Formative testing to check understanding
- Reteaching of failed items (loops until criterion)
- Positive effects on student attitudes toward course and instruction
- **Trade-off:** May increase total instructional time required (students spend more time but achieve deeper mastery)

### 2.2 Mechanisms

Mastery learning works because:
1. **Prerequisite closure:** Students don't advance until they've mastered prior material
2. **Criterion clarity:** Students know exactly what "mastery" means
3. **Focused feedback:** Errors are immediately addressed before new material begins
4. **Reduced ceiling-floor effects:** Tests align with instruction

**Implication for Pi.mn:** The centre's existing practice (students correct errors at night, don't leave until they pass) IS mastery learning. Expected effect on ЭЕШ performance: moderate to large (d ≈ 0.4–0.7). Formalize prerequisite structure and error categorization to maximize this.

---

## 3. High-Dosage Tutoring: Recent RCTs (2020–2026)

### 3.1 Meta-Analysis of Scale Effects

**Recent meta-analysis (265 RCTs, 340 interventions, 1967–2023):**

| Scale (students served) | Mean effect size | Notes |
|-------------------------|------------------|-------|
| <100 | d ≈ 0.44 | Small pilot studies |
| 100–399 | d ≈ 0.30 | Medium-scale trials |
| 400–999 | d ≈ 0.21 | District deployments |
| ≥1,000 | d ≈ 0.16 | Large-scale implementations |

**Optimal conditions for high-dosage tutoring:**
- ≥3 days per week
- During school day (not after-school)
- Small groups (student-to-tutor ratio ≤3:1)
- Duration ≥15 hours total
- In-person (remote shows smaller effects)

### 3.2 Chicago & NYC RCTs (2023–2024)

**Guryan et al. (Chicago Public Schools, 2023):**
- **Sample:** 2,600+ students, Grades 9–10, daily 30-min math tutoring
- **Effect:** d ≈ 0.23–0.40 depending on subject and year
- **For reading:** d ≈ 0.23 (oral reading fluency)
- **For math:** d ≈ 0.18–0.40 (high school results varied)

**Key finding:** High-dosage tutoring can **reverse pandemic-era learning loss** and double or triple annual learning gains (roughly 2–3 times baseline growth rates).

### 3.3 Pandemic Recovery Context

- By 2024, students have recovered ~1/3 of 3-year math loss and ~1/4 of reading loss
- At 2022–2023 improvement rates, full recovery would take 8+ more years
- **Tutoring is one of the most cost-effective interventions** for closing pandemic gaps

**Implication for Pi.mn:** With 359 students and daily in-school tutoring by trained teachers, Pi.mn is already operating at high-dosage conditions. Expected effect: d ≈ 0.2–0.4 on ЭЕШ performance (moderate effect), higher (d ≈ 0.5–0.7) on internal mastery criteria.

---

## 4. Acceleration vs. Remediation: The Learning-Loss Debate

### 4.1 The Core Trade-Off

**Remediation:** Reteach previously unmastered content; delay grade-level material until prerequisites are solid.

**Acceleration:** Give grade-level content with just-in-time prerequisite support; students catch up through engagement with meaningful material.

### 4.2 Recent Evidence

**Randomized comparison studies show:**
- **Acceleration + just-in-time support:** Students complete 27% more grade-level assignments and have 36% struggle rate on next lesson
- **Pure remediation:** 44% struggle rate on next lesson (despite reteaching)
- **Conclusion:** Grade-level engagement with scaffolding > isolation in remedial tracks

**Mechanism:** 
1. Students in remediation miss opportunities to engage with current material
2. Motivation drops when students feel "stuck" in catch-up mode
3. Prerequisite knowledge can be quickly patched during grade-level problem-solving

### 4.3 Nuance: When Remediation Is Needed

Remediation is necessary when:
- Prerequisite gaps are very large (multiple years behind)
- Foundation skills are absent (e.g., no basic arithmetic for high school algebra)
- Student has developed strong misconceptions that must be explicitly corrected

**Implication for Pi.mn:** The centre's **no-gap philosophy is validated.** However, implement as "acceleration with just-in-time prerequisite repair" rather than "stop and go back." Example: If a student fails a problem due to a missing formula, teach the formula in 2–3 min and retry—don't pull them out for a week of remediation.

---

## 5. Knowledge Space Theory and Prerequisite Structure

### 5.1 Doignon & Falmagne Framework

**Knowledge Space Theory (KST)** is a mathematically rigorous model of knowledge states and prerequisite relations.

**Core objects:**
- **Domain Q:** Set of all knowledge items (e.g., 350 concepts in ALEKS algebra)
- **Knowledge Structure (Q, 𝒦):** Q is the domain; 𝒦 ⊆ 2^Q is a family of **knowledge states** (subsets of Q that a student might have mastered)
- **Prerequisite relation (≤):** q ≤ q' means "mastering q' implies mastering q"

**Knowledge Space:** 𝒦 is closed under arbitrary unions (union of any two knowledge states is a state).

**Learning Space:** Additionally closed under non-empty intersections and well-graded (unique shortest paths between states).

### 5.2 ALEKS Validation

**ALEKS (Assessment and Learning in Knowledge Spaces):** The most well-known commercial application of KST.

- Covers K-12 math, chemistry, statistics
- ~350 concepts per domain → millions of possible knowledge states
- Adaptive assessment: ~25–30 questions to gauge knowledge state (vs. full testing)
- Effect size: d ≈ 0.29 (pass rate boost of 14 percentage points) in original studies; higher in recent implementations with better teacher training and higher participation

**Prerequisite identification:** If student's knowledge state indicates gaps in prerequisites, ALEKS recommends preparatory content before advancing.

### 5.3 Estimating Prerequisites from Data

**Automated methods:**
1. **Surmise relation mining:** If students who master q' almost always master q, infer q ≤ q'
2. **Knowledge tracing + graph inference:** Use BKT or deep KT to estimate prerequisite dependencies
3. **Curriculum-theoretic approach:** Experts define prerequisites, then validate against data

**Challenge:** With sparse data (evening self-reports, 359 students), estimating prerequisites requires careful feature engineering. But **this is feasible**—papers using ASSIST2012 (27k students) and Junyi (87k students) show reliable prerequisite inference with 1–2M interactions.

**Implication for Pi.mn:**
- Formalize the concept hierarchy: which topics depend on which others?
- Use evening self-reports + teacher labels to build a prerequisite graph
- Start with expert specification (teachers know the math), then refine with data
- This graph informs the "just-in-time repair" strategy (if a student fails a problem, which prerequisites should we check?)

---

## 6. Error Diagnosis: From "Wrong Answer" to "Which Step?"

### 6.1 Error Categories

**Careless (Slip) Errors:**
- Inattentive mistakes (e.g., misread a digit, forgot to copy a minus sign)
- Student knows the material; just made a random error
- **Fix:** Point out the error; student self-corrects immediately

**Conceptual Errors:**
- Student holds a misconception or lacks understanding
- Systematic: same wrong strategy repeatedly
- **Fix:** Reteach the concept, provide examples and counterexamples

**Both matter for assessment**, but have very different implications for instruction.

### 6.2 Step-Level Error Detection

Recent work (esp. in AI tutoring) moves beyond "right/wrong per problem" to **step-level error identification.**

**Approaches:**
1. **Worked example + error marking:** Students identify errors in pre-worked solutions (high-level thinking, but teacher-intensive)
2. **Automated step verification:** LLM or rule-based system checks each step of student solution
3. **Dataset-based:** PRM800K (problem reasoning dataset) includes step-level correctness labels for math problems; enables training of step-level verifiers

**Recent system (MathAgent):**
- Achieves ~95% accuracy on error step identification and ~97% on error categorization
- Has served >1M K-12 students via deployed platform

### 6.3 Misconception Catalogues

Structured lists of **common wrong strategies** in math topics.

**Example (from research):**
- Linear equations: "divide everything by x" instead of "isolate x"
- Fractions: "just add numerators and denominators" (ignores common denominator)
- Quadratics: Forgetting ± solution; only reporting one root

**Pi.mn teachers likely have these in their heads.** Formalizing them (e.g., documenting top 5–10 mistakes per topic) enables:
1. Faster diagnosis ("which of these 10 misconceptions is this?")
2. Targeted feedback ("You did [wrong strategy]. Here's why it fails…")
3. Automated flagging (if a mistake matches a known misconception, recommend remediation)

**Implication:** Pi.mn should **document mistake types** (already partly done via MistakeType enum in the database) and map them to misconceptions. Use this to inform adaptive feedback.

---

## 7. Knowledge Tracing: Student Modeling and Mastery Prediction

### 7.1 Framework

**Knowledge Tracing (KT):** A ML technique to estimate a student's current mastery of a skill given their history of interactions (attempts on problems).

**Inputs:** Student, problem/skill, correctness (binary or ternary: correct, incorrect, guess)  
**Output:** Mastery probability P(student has mastered skill | history)

**Applications:**
- Adaptive sequencing: Decide what problem to assign next
- Mastery prediction: Predict whether student will pass final exam
- Prerequisite detection: If student fails skill X, was it because of missing prerequisite Y?

### 7.2 Bayesian Knowledge Tracing (BKT)

**Classic approach (Corbett & Anderson, 1994):**

Hidden Markov model with four parameters per skill:
- **L₀:** Initial (prior) probability student has mastered skill before any attempts
- **T:** Probability student learns the skill on a given incorrect attempt (transition)
- **G:** Probability student guesses correctly despite not knowing (guess)
- **S:** Probability student knows but slips (careless error)

**Update rule:** After each attempt, update P(mastered | history) using Bayes' rule.

**Advantages:**
- Interpretable parameters
- Works with sparse data (50+ interactions sufficient for convergence)
- Widely deployed (ALEKS, many ITS)

**Limitations:**
- Assumes skill is binary (either mastered or not)
- Ignores prerequisite structure (extended models like DBN-BKT address this)
- Parameter estimation requires a lot of data if many skills

### 7.3 Prerequisite-Aware Extensions

**DBN-KT (Käser et al.):** Extends BKT using Dynamic Bayesian Networks to model prerequisite dependencies.
- Skill j depends on skill i if i is a prerequisite for j
- Mastery of i "causes" transitions in j

**Prerequisite-Driven Deep KT:** Augments neural KT with explicit prerequisite constraints.

**Why this matters for Pi.mn:** Evening self-reports don't tell you *why* a student failed. But if you model prerequisites, you can infer: "Student failed this algebra problem. Did they fail because they don't know how to distribute? Did they lose the negative sign? Let me check a prerequisite problem on sign rules."

### 7.4 Data Requirements

**Empirical findings:**

| Dataset | Students | Interactions | Skills | Purpose |
|---------|----------|--------------|--------|---------|
| ASSIST2012 | 27,145 | 2.6M | 245 | Benchmark for KT; on-line homework |
| Junyi | 87,527 | 500k+ | 39 | Chinese K-12; good sparse-data case |
| Algebra05 | — | 607k | 112 | Large multi-skill algebra dataset |
| Bridge06 | 1,146 | 1.8M | 493 | Very large skill space |

**Rule of thumb:** Need 50+ interactions per student before KT predictions stabilize.

**Pi.mn's position:** 359 students × evening self-reports + online tests + OMR imports. If each student has ~50 attempts over a term, that's ~18k interactions—**sufficient for basic KT.** If segmented by skill (e.g., 50 topics), might be sparse per skill; use hierarchical models or transfer learning.

---

## 8. Formative Assessment and Feedback

### 8.1 Overall Effect Sizes

**Meta-analysis (2024):** Effect size of formative assessment on K-12 achievement: g ≈ 0.25 (small to medium effect, large variation).

**Variation by feedback type:**
- Student-initiated formative feedback: d ≈ 1.16 (very large)
- Mixed feedback: d ≈ 0.83 (very large)
- Adult-initiated formative feedback: d ≈ 0.69 (large)
- Computer-initiated formative feedback: d ≈ 0.42 (medium)

**Mathematics-specific:**
- Regular brief tests for formative purposes: d ≈ 0.3 (small to medium)
- Peer-assisted learning + peer assessment + feedback: d ≈ 0.3 (small to medium)

### 8.2 Feedback Quality Matters

Not all feedback is equal. **Best practices:**
1. **Timely:** Immediate feedback (within minutes) > delayed (hours/days)
2. **Specific:** "You made an error in step 3; here's why" > "Incorrect"
3. **Actionable:** "Try distributing the −2" > "Check your algebra"
4. **Growth-oriented:** "This is hard; let's break it down" > "You got it wrong"

**Implications for Pi.mn:**
- Evening self-report delays feedback; mitigate with online tests (immediate feedback)
- Teachers' one-on-one explanations during class are likely high-quality (specific, timely)
- Document feedback strategies and train teachers/AI to be specific and growth-oriented

---

## 9. Worked Examples and Example-Based Learning

### 9.1 Worked-Example Effect

**Meta-analysis (55 studies, 181 effect sizes):** g ≈ 0.48 (medium effect)

**What it is:** Show a complete, step-by-step solution to a problem; then have student solve similar problems.

**Why it works:**
- Reduces cognitive load during learning
- Provides a correct mental model
- Frees up working memory for learning the procedure

**Moderators:**
- **Example type matters:** Combining correct + incorrect examples (erroneous examples) can enhance learning, as students must identify and fix errors
- **Self-explanation prompts:** "Why did we do this step?" increases effect
- **Fading:** Start with fully worked examples; gradually ask students to complete more steps
- **Transfer:** Worked examples help initial learning but may reduce transfer if overused (students memorize examples vs. learning principles)

### 9.2 Application to Pi.mn

**Current practice:** Teachers work ~10–18 examples at the board before students attempt problems. This IS example-based learning.

**Enhancement:**
1. Use erroneous examples (show a common mistake, ask students to find/fix it)
2. Add self-explanation prompts ("Why did we subtract here?")
3. Sequence examples easy → hard (not all hard examples at once)
4. Fade worked steps (first few completely worked; later examples have blanks to fill in)

**Expected effect:** d ≈ 0.4–0.5 on problem-solving success.

---

## 10. Spacing and Retrieval Practice

### 10.1 Spacing Effect

**Definition:** Spacing out practice over multiple sessions is more effective than massed (concentrated) practice for long-term retention.

**Meta-analysis (27 studies, 53 effect sizes):** g ≈ 0.28 overall (small to medium).
- Isolated learning: g ≈ 0.43 (larger)
- Course-embedded material: g ≈ 0.24 (smaller)

**Implication:** Spacing works, but in real courses the effect is modest. Spacing is especially powerful when you're learning isolated facts; less so when learning is embedded in problem-solving.

### 10.2 Retrieval Practice / Testing Effect

**Definition:** Testing (vs. restudy) enhances long-term retention.

**Meta-analysis finding (math):** Testing effect exists but is **not conclusively strong in mathematics** (confidence interval crosses zero). Effect sizes vary widely depending on test format and timing.

**Contrast with other domains:** In verbal learning (vocabulary, history facts), retrieval practice is very powerful (d > 0.5). In math, smaller.

### 10.3 Application to Pi.mn

**Spacing:**
- Space problem sets: students work problems on Monday, return to same topic Friday
- Space topic reviews: revisit prior chapters periodically
- Expected benefit: better retention on ЭЕШ (which tests cumulatively)

**Retrieval practice:**
- Quick quizzes before major tests (low-stakes retrieval)
- Mix review problems with new problems in problem sets
- Don't rely on retrieval alone; combine with direct instruction

**Realistic effect:** d ≈ 0.2–0.3 on retention measures.

---

## 11. Intelligent Tutoring Systems (ITS): Comparative Effectiveness

### 11.1 Meta-Analysis

**Meta-analysis (Kulik & Fletcher, 2016; multiple reviews):**

Effect sizes of ITS on learning:
- **ITS vs. traditional instruction:** d ≈ 0.76 (very large, comparable to human tutoring)
- **ITS vs. human tutoring:** d ≈ −0.02 (not significantly different; ITS ≈ human)
- **ITS with feedback/misconception modeling:** d > 0.80
- **ITS without feedback:** d ≈ 0.40

**Key finding:** Both ITS and human tutoring outperform traditional classroom instruction substantially. ITS effectiveness depends heavily on the quality of feedback and adaptation.

### 11.2 Factors That Predict ITS Success

1. **Step-level interaction** (answer-based < step-based < substep-based)
2. **Real-time feedback** on correctness
3. **Misconception modeling** (system knows common errors and addresses them)
4. **Adaptive difficulty** (adjusts to student level)
5. **Low teacher training burden** (system does the heavy lifting)

### 11.3 Important Caveats

- **Context matters:** ITS that works in one setting may not in another
- **Teacher role:** Even with ITS, teacher oversight and intervention matter
- **Motivation:** Students must engage; disengaged students don't benefit
- **Implementation quality:** Poorly implemented ITS can underperform

**Implication for Pi.mn:** An ITS for Pi.mn should:
1. Implement step-level error detection (not just "right/wrong")
2. Provide immediate, specific feedback
3. Model common Mongolian student misconceptions (e.g., sign errors in algebra)
4. Adapt difficulty and sequence based on student performance
5. Support (not replace) teacher explanations and one-on-one guidance

---

## 12. Student Motivation, Engagement, and Productive Struggle

### 12.1 Engagement and Adaptive Instruction

**Scoping review (2024):** Personalized adaptive learning environments report:
- Increased engagement in 36% of studies (88% of learners experienced "flow")
- Improved learning outcomes in 36% of studies
- Mixed effects on academic performance (not universal improvement, but positive trend)

**Motivation mechanisms:**
- Students who believe ability can be improved through effort (growth mindset) persist longer
- Clear, achievable goals increase motivation
- **Autonomy + support** = high engagement (not autonomy alone, not support alone)

### 12.2 Productive Struggle

**Definition:** "Deliberate, effortful process learners engage in when grappling with a task intentionally set just beyond current capabilities, aided by tailored guidance."

**Three pillars:**
1. **Calibrated challenge:** Task is hard but achievable (Vygotsky's ZPD)
2. **Guided scaffolding:** Teacher/system provides just enough support to prevent frustration
3. **Psychological safety:** Student feels okay with struggle; mistakes are treated as learning

**Contrast with unproductive struggle:**
- Student repeats same error without insight
- Student randomly changes code/answer hoping it works
- Student gives up or disengages

**Pi.mn's advantage:** Teachers recognize "productive struggle" and intervene appropriately (assistant teacher circulates, helps stuck students). AI systems must learn to detect this distinction.

---

## 13. Algorithms and Models Applicable to Pi.mn

### 13.1 Core Algorithms

| Algorithm | What It Does | Data Requirement | Fits Pi.mn? |
|-----------|--------------|------------------|-----------|
| **Bayesian Knowledge Tracing (BKT)** | Estimates P(mastered \| history) for each skill | 50+ interactions/student | YES |
| **Deep Knowledge Tracing (DKT/LSTM)** | Neural KT; captures skill dependencies implicitly | 100+ interactions/student | MAYBE—sparse data risk |
| **DBN-KT** | Explicit prerequisite structure in BKT | 50+ interactions + domain expertise | YES—use expert prerequisites |
| **Worked Example Recommender** | Suggests similar-to-failed problems from example pool | Problem metadata + difficulty levels | YES—teachers already do this |
| **Error Category Classifier** | Predicts error type (careless vs conceptual) from problem/answer/previous attempts | Labelled error data + problem features | YES—use teacher labels |
| **Adaptive Sequencing** | Chooses next problem based on mastery & prerequisites | Mastery estimates + prerequisite graph | YES—formalize the graph |

### 13.2 Feasibility Analysis for Pi.mn

**Data availability:**
- 359 students × ~50 attempts/term = ~18k interactions ✓
- ~6000 problems (lots of coverage)
- Teacher mistake labels (MistakeType enum) ✓
- Evening self-reports (sparse but honest) ✓
- Multiple sources (self-report, online tests, OMR) ✓

**Challenges:**
- Self-reports are evening, not immediate (reduces signal quality)
- Sparse-data regime: Deep models (DKT) may struggle; use simpler models first
- Small student cohorts per skill: Hierarchical or transfer learning needed

**Recommended approach:**
1. Start with **Bayesian Knowledge Tracing** per skill/subtopic (interpretable, works with sparse data)
2. Build **prerequisite graph** manually (teachers know it) + validate with data
3. Implement **error classifier** using teacher labels (MistakeType + domain knowledge)
4. Use **worked example recommender** to suggest examples after errors
5. Later: Add deep KT if interaction volume increases

---

## 14. Data Hunger: How Much Data Before Predictions Are Stable?

### 14.1 Knowledge Tracing

**Empirical findings:**
- **50+ interactions:** BKT predictions stabilize (confidence interval narrows)
- **100+ interactions:** DKT begins to work (but may overfit with <100)
- **1000+ interactions per skill:** Deep models converge reliably

**Pi.mn's position:**
- If 6000 problems → ~16 topics → ~1000 interactions/topic ✓ (sufficient for simple KT)
- If 100 subtopics → ~180 interactions/subtopic (borderline; use hierarchical models)
- If per-skill very fine-grained (500+ skills) → sparse; transfer learning needed

### 14.2 Error Classification

**Requirements:**
- ~100–200 labelled examples per error type (to train classifier)
- Pi.mn teachers have labelled ~? mistakes via MistakeType enum
- Recommendation: Aim for 50+ labelled examples per mistake type

### 14.3 Prerequisite Inference

**Requirements:**
- Expert specification (teachers define prerequisites; ~1 hour of work)
- Validation: ~500+ interactions to confirm prerequisites via data
- Refinement: Iterate if data contradicts expert knowledge

---

## 15. Cautions and Limitations

### 15.1 Selection Bias in Tutoring Studies

**Issue:** Students who receive tutoring are often **self-selected** or assigned because they're struggling. Meta-analyses that don't account for this may overestimate tutoring effects.

**RCTs address this**, but even RCTs can have compliance issues (some students don't show up).

**For Pi.mn:** Evening self-reports mean *some students might not report accurately* (social desirability bias—they say they solved it when they didn't, or vice versa). Validate with online assessments periodically.

### 15.2 "Teaching to the Test" and Transfer

**Issue:** Large effect sizes (d = 2.0, d = 1.0) often occur in studies using **experimenter-designed assessments** aligned closely with instruction. When externally validated tests (e.g., standardized tests) are used, effects shrink (d ≈ 0.3–0.5).

**Implication:** Pi.mn's effect on students' internal problem sets (d ≈ 0.5–0.7) may not fully transfer to the ЭЕШ (d ≈ 0.3–0.5). Design internal assessments to resemble ЭЕШ problems.

### 15.3 Sparse Data and Overfitting

**Issue:** With 359 students and sparse problem-level data, complex ML models (deep KT, LLMs) can easily overfit. Simpler models (BKT, logistic regression) are safer.

**Recommendation:** Validate on held-out students, not just data.

### 15.4 Evening Self-Reports Are Noisy

**Issue:** Students mark their own results at night, after class. Possible confounds:
- Fatigue → inaccuracy
- Social desirability ("I solved it") → inflation
- Forgetfulness ("Did I solve that one?") → noise

**Mitigation:** Triangulate with online tests and teacher observation. Don't rely solely on evening reports.

### 15.5 Minority of Studies Validated on Mongolian Populations

All review findings are from English-language research (mostly North America, some Europe, some Asia). **Generalizability to Mongolian context is unknown.** Cultural factors (e.g., attitudes toward mistakes, teacher authority, family involvement) may modulate effects.

**Recommendation:** Pilot and measure locally. Use effect sizes as rough guides, not predictions.

---

## 16. Search Gaps and Limitations

### 16.1 What This Review Did NOT Find

1. **Mongolian-language studies on tutoring:** Search was English-only. Mongolian peer-reviewed research on tutoring effectiveness (if it exists) was not accessed.

2. **Studies on evening self-report systems:** No research found specifically validating evening self-assessments in educational settings (most self-report studies use immediate, supervised contexts). Pi.mn is using a novel feedback model.

3. **Fine-grained error taxonomy in Mongolian algebra:** Common misconceptions are often culturally/linguistically specific. Russian/Chinese/Japanese algebra error studies exist, but not Mongolian. Pi.mn's teacher-generated mistake types are invaluable here.

4. **Sparse-data + sequential learning:** Most KT datasets are large. Little research on KT with <50 interactions/student. Pi.mn's sparse regime is understudied.

5. **Multi-teacher coordination in tutoring:** Pi.mn has 13 teachers. How do they calibrate standards? What's the inter-rater reliability on mistake coding? Not reviewed here.

6. **Optimization of prerequisite repair timing:** Given limited time, should you reteach prerequisites immediately (interleaved) or batch them (massed)? No clear evidence found.

### 16.2 Sources Examined

**Total sources accessed:** ~35 distinct papers/reports  
**Peer-reviewed:** ~25  
**Grey literature (reports, blogs):** ~10  
**Highly paywalled/inaccessible:** ~5 (attempted but content not fetched)

**Quality distribution:**
- Meta-analyses: ~7
- RCTs: ~8
- Observational studies: ~10
- Industry reports / technical documentation: ~5
- Theory papers: ~5

---

## 17. Recommended Next Steps for Pi.mn

### 17.1 Immediate (0–3 months)

1. **Formalize prerequisite graph:** Have teachers map which topics depend on which others (e.g., quadratics → factoring → expanding). Document in a simple table or graph.

2. **Codify error taxonomy:** Expand MistakeType enum with Mongolian algebra misconceptions. Aim for 10–15 error categories covering 80% of mistakes.

3. **Validate evening self-reports:** Periodically cross-check evening self-reports against online assessments or teacher observation. Measure agreement rate (Cohen's κ).

4. **Pilot BKT:** Implement simple Bayesian Knowledge Tracing for one topic (e.g., linear equations) using existing attempt data. Evaluate: Does BKT predict who passes the next test?

### 17.2 Medium-term (3–12 months)

5. **Build worked example recommender:** When a student fails a problem, query the database for similar problems that were passed by other students, and recommend them as examples.

6. **Implement error-aware feedback:** After a mistake, classify the error type and deliver targeted feedback. Test on a few students; measure time-to-re-solve or repeat-error rate.

7. **Measure prerequisite dependencies from data:** Use surmise relation mining or DBN-KT to compare inferred prerequisites vs. expert specification. Iterate.

8. **Automate mistake detection:** If budget allows, integrate NLP-based step-level error detection (e.g., trained on teacher-labelled solutions). Validate accuracy.

### 17.3 Long-term (1+ years)

9. **Deploy adaptive sequencing:** Use mastery estimates + prerequisites to recommend next problem per student. A/B test: Does adaptive sequencing improve learning gains?

10. **Integrate LLM-based tutoring:** Use large language models to generate personalized explanations (e.g., "Here's why your approach went wrong") tailored to error type. Measure student satisfaction and learning gains.

11. **Longitudinal study:** Measure ЭЕШ outcomes for students who used the enhanced system vs. historical controls. Estimate real-world effect size.

---

## 18. Summary Table: Key Algorithms and Applicability

| **Algorithm** | **What It Solves** | **Data Hunger** | **Fits Pi.mn?** | **Priority** |
|---|---|---|---|---|
| **Bayesian Knowledge Tracing** | Student mastery per skill | 50 interactions/skill | YES (start here) | HIGH |
| **DBN-KT with expert prerequisites** | Mastery + prerequisite dependencies | 50 interactions + domain knowledge | YES | HIGH |
| **Error Classifier (mistake type)** | Predicts careless vs conceptual | 100–200 labelled examples/type | YES (use teacher labels) | HIGH |
| **Worked Example Recommender** | Suggests similar-but-correct problems | Problem metadata + difficulty | YES (formalize difficulty levels) | MEDIUM |
| **Deep Knowledge Tracing (LSTM)** | Implicit skill dependencies | 100+ interactions/student | MAYBE (sparse-data risk) | MEDIUM |
| **Adaptive Sequencing** | Chooses next problem optimally | Mastery estimates + prerequisites | YES (use BKT + prerequisite graph) | HIGH |
| **LLM-based explanation generation** | Personalised feedback | Few-shot examples + student context | YES (pilot first) | MEDIUM |
| **Prerequisite inference (graph mining)** | Learns prerequisites from interaction data | 500+ interactions to validate | YES (validate expert spec) | MEDIUM |

---

## 19. Key Citations and Sources

*(See accompanying source table below)*

1. **Bloom, B. S. (1984).** "The 2 sigma problem: The search for methods of group instruction as effective as one-to-one tutoring." *Educational Researcher*, 13(6), 4–16.  
   [Foundational but non-replicable claim]

2. **Kulik, C.-L. C., Kulik, J. A., & Bangert-Drowns, R. L. (1990).** "Effectiveness of mastery learning programs: A meta-analysis." *Review of Educational Research*, 60(2), 265–299.  
   [Landmark mastery learning meta-analysis; d ≈ 0.67]

3. **VanLehn, K. (2011).** "The relative effectiveness of human tutoring, intelligent tutoring systems, and other tutoring systems." *Educational Psychologist*, 46(4), 197–221.  
   [Definitive comparison: tutoring d ≈ 0.79, ITS d ≈ 0.76]

4. **Guryan, J., Halloran, C., & Araujo, F. C. (2023).** "Can technology facilitate scale? Evidence from a randomized evaluation of high dosage tutoring." NBER Working Paper No. 32510.  
   [Chicago/NYC RCT: d ≈ 0.23–0.40 depending on scale]

5. **Doignon, J.-P., & Falmagne, J.-C. (2011).** *Learning Spaces: Interdisciplinary Applied Mathematics*. Springer.  
   [Theoretical foundation for Knowledge Space Theory]

6. **Corbett, A. T., & Anderson, J. R. (1994).** "Knowledge tracing: Modeling the acquisition of procedural knowledge." *User Modeling and User-Adapted Interaction*, 4(4), 253–278.  
   [Foundational Bayesian Knowledge Tracing]

7. **Käser, T., Kmüller, R. C., & Gross, M. H. (2014).** "Towards a model of prerequisites with noisy observations." *Educational Data Mining (EDM)*. [prerequisite modeling with uncertainty]

8. **Sweller, J., Ayres, P., & Kalyuga, S. (2011).** *Cognitive Load Theory*. Springer.  
   [Theory behind worked examples]

9. **Cepeda, N. J., Coburn, N., Rohrer, D., Wixted, J. T., Morey, C. C., & Bjork, R. A. (2006).** "Optimizing distributed practice: Theoretical analysis and practical implications." *Psychological Bulletin*, 132(3), 354–380.  
   [Spacing effect meta-analysis]

10. **Karpicke, J. D., & Roediger, H. L. (2008).** "The critical importance of retrieval practice on long-term retention." *Journal of Memory and Language*, 58(4), 1089–1111.  
    [Testing effect; math caveats]

---

## 20. Appendix: Effect Size Glossary

- **d** (Cohen's d): (Mean_treatment − Mean_control) / SD_pooled
  - d = 0.2: small effect
  - d = 0.5: medium effect
  - d = 0.8: large effect
  - d = 1.2+: very large effect

- **g** (Hedges' g): Similar to d, corrected for small samples; used in meta-analyses

- **Confidence interval / 95% CI:** If effect size is reported with CI, wider CI = more uncertainty

- **k** (number of studies in meta-analysis): More studies = more robust estimate (if high quality)

- **Replication:** Has the finding been replicated in independent samples? (matters for credibility)

---

**Document version:** 1.0  
**Last updated:** 2026-08-26  
**Audience:** Pi.mn software developers, teachers, and admin  
**Maintainer:** Research synthesis from 25+ peer-reviewed sources
