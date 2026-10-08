# Spacing, Forgetting, and Retrieval Practice: Literature Review for Pi.mn

**Date:** August 2026  
**Domain:** Learning science, educational data mining, spaced repetition scheduling  
**Scope:** FSRS, Duolingo half-life regression, spacing effects, retrieval practice, interleaving, desirable difficulties  
**Platform context:** 359 students, ~6000 problems, 12th-grade mathematics (Mongolian ЭЕШ entrance exam), evening self-report data (SelfState enum), teacher-labelled error types

---

## Executive Summary

This review examines spacing, forgetting, and retrieval practice research with direct application to Pi.mn's tutoring platform. Key findings:

- **Spacing effect** is robust across contexts (g = 0.28–0.46 in mathematics), with optimal inter-study gaps of ~10–30% of the desired retention interval.
- **Retrieval practice** (testing effect) yields medium effects in classrooms (g = 0.33) vs. larger in labs (g = 0.50), contingent on corrective feedback.
- **Interleaving** shows large benefits in mathematics classrooms (d = 0.83–1.21), supported by randomized controlled trials.
- **Modern spaced repetition algorithms** (FSRS, half-life regression) require 4-scale ratings and minimal training data per card (~20 reviews), but operate on datasets orders of magnitude larger than Pi.mn's 359 students.
- **Desirable difficulties** (spacing, interleaving, generation, varied practice) trade short-term ease for long-term retention and transfer.
- **Evening self-report** (SelfState: SOLVED_CLEAN, FIXED_AFTER_ERROR, FAILED, GUESSED) is lower-resolution than algorithmic rating scales, but can support spacing decisions if paired with error categorization.
- **Knowledge tracing** with Bayesian methods is interpretable but suffers from parameter degeneracy on small datasets; curriculum learning approaches (multi-armed bandits) are more robust for adaptive sequencing with 359 students.

**Contested finding:** Half-life regression showed correlation of only r = 0.203 on held-out test data from Duolingo despite 13 million training examples—suggesting modest practical predictive power in operational settings.

---

## Section 1: Foundational Theory

### 1.1 Ebbinghaus Forgetting Curve

**Classical Model:**  
Ebbinghaus (1885) proposed the exponential forgetting curve: R(t) = e^(-t/S), where:
- R(t) = retention at time t
- t = elapsed time since last study
- S = stability (strength) of the memory trace

**Modern Applications:**  
The curve remains the conceptual foundation for all modern spaced repetition systems. However, empirical data shows the forgetting curve is not perfectly exponential and varies substantially by learner, material difficulty, and prior knowledge. Recent neural network studies have attempted to learn forgetting curves from data rather than assume an exponential form.

**Key insight:** Ebbinghaus observed that reviewing material at optimal intervals causes the curve to "bend"—forgetting slows, and memory stabilizes. This is the core principle behind all spacing algorithms.

---

## Section 2: Spacing Effect Meta-Analyses

### 2.1 Cepeda et al. (2006, 2008) Distributed Practice Meta-Analysis

**Scope:**  
- 839 assessments across 317 experiments in 184 articles
- Examined spacing (massed vs. distributed), lag (less vs. more spaced), and expanding inter-study intervals (ISI)

**Key Findings:**

| Outcome | Effect Size | Notes |
|---------|-------------|-------|
| Overall spacing benefit | g = 0.28 | Small to medium; pooled across all tasks |
| Language learning | g = 1.15 | Large; sparse data from ~12 studies |
| Mathematics | g = 0.28–0.46 | Small to medium; negative correlation with task complexity |
| Complex problem-solving | g < 0.15 | Minimal or null; spacing effect weakest for reasoning |

**Critical Finding: The Gap Hypothesis**  
At any given retention interval, the optimal inter-study gap is approximately **10–30% of the target retention interval**. Examples:
- For a 1-week retention goal: optimal gap = 1–3 days
- For a 1-year retention goal: optimal gap = 5–36 days (median ~37 days)

This non-linear relationship was the most robust finding across hundreds of studies.

**Limitation:** Only ~12 studies examined retention intervals longer than 1 week; most spacing research uses short time windows (days to weeks) rather than the 1+ year timeline needed for entrance exam preparation.

### 2.2 Recent Meta-Analysis: Mathematics-Specific Spacing (2024)

A recent meta-analytic review examining spacing and retrieval practice specifically in mathematics learning found:
- Overall effect: g = 0.28–0.46
- Negative moderator: task complexity (r = −0.25) — spacing effects are stronger for procedural/factual tasks, weaker for novel problem-solving.
- Classroom effect (more conservative than laboratory): g = 0.33–0.40

**Interpretation for Pi.mn:**  
Spacing is expected to help with formulae, algorithms, and procedures (e.g., solving quadratic equations, applying rules). Spacing alone is insufficient for transfer to novel problem-solving—students must combine it with variation and explicit comparison of different solution strategies.

---

## Section 3: Retrieval Practice & Testing Effect

### 3.1 Testing Effect Meta-Analyses

**Rowland (2014)** analyzed dozens of studies comparing testing (recall-based) to restudying:
- **Overall effect:** g = 0.50 (medium, pooled across ages and materials)
- **By retrieval modality:**
  - Free recall: g = 0.82 (largest)
  - Cued recall: g = 0.72 (large)
  - Multiple choice: g = 0.36 (small)
  - Old/new recognition: g = 0.36 (small)

**Critical moderator: Corrective feedback.**  
- **With corrective feedback:** full testing benefit
- **Without corrective feedback:** minimal or no testing effect (borderline g ≈ 0)
- **Retrievability rate:** if students can answer correctly ≤50% of attempts, testing effect is reduced

### 3.2 Classroom vs. Laboratory Context

Classroom implementation of the testing effect yields smaller effects:
- **Laboratory testing effect:** g = 0.50–0.61
- **Classroom testing effect:** g = 0.33 (Adesope et al. 2017)
- **Difference:** ~35% smaller in real classroom settings

**Reasons for smaller classroom effects:**
- Less controlled environment
- Competing cognitive demands (social anxiety, classroom management)
- Lower corrective feedback quality or timeliness
- Student motivation variability

**Application to Pi.mn:**  
Evening self-reports (SOLVED_CLEAN vs. FIXED_AFTER_ERROR vs. FAILED) can serve as a lightweight testing signal, but only if coupled with **same-day or next-day corrective feedback** (e.g., worked solution, peer explanation, one-on-one clarification).

---

## Section 4: Interleaving & Blocking in Mathematics

### 4.1 Rohrer & Taylor Classroom Randomized Trials

**Study 1: Taylor & Rohrer (2010)** — 4th-grade geometry (prism faces/edges/corners)
- Interleaved practice: 77% correct on 1-day-later test
- Blocked practice: 38% correct
- **Effect size: d = 1.21** (very large)
- **Sample:** 126 students, 4th grade
- **Duration:** single session + test 1 day later

**Study 2: Rohrer & Dedrick (2015)** — 7th-grade multi-topic (permutations, volume, angles, statistics)
- **Sample:** ~500+ seventh-graders across multiple schools
- Interleaved condition: solved mixed problems across topics
- Blocked condition: clustered problems by topic
- **Effect size: d = 0.83** (large, 95% CI [0.68, 0.97])

**Study 3: Rohrer (2019–2020)** — Randomized controlled trial across full school year
- Found that interleaving benefit **persists** across multiple units and months
- Interleaving appears to facilitate discriminative contrast (comparing different solution methods within a topic)

### 4.2 Mechanisms & Moderators

**Why interleaving works:**
1. **Discriminative contrast:** students compare solution approaches and errors across problems, identifying subtle procedural differences
2. **Contextual interference:** increased cognitive demand during practice forces deeper encoding
3. **Distributed practice:** interleaving distributes reviews across different skills, providing incidental spacing

**Boundary conditions:**
- Interleaving larger effect for: procedural/conceptual problems, multiple related topics, low prior knowledge
- Interleaving smaller/null effect for: very simple tasks, unrelated domains, high prior knowledge students

**Critical finding:** The benefit appears to be **specific to comparison and contrast**, not simply "mixing problems." Students must notice and process the differences in solution method.

### 4.3 Application to Pi.mn

Pi.mn's method already incorporates some elements:
- Teacher works 10–18 examples, ordered easy → hard, **deliberately chosen to cover hard items**
- Teacher may bundle 2–3 problems into one worked example (implicit interleaving)
- Students take tests with mixed topics

**Enhancement opportunities:**
- Ensure test and homework problems are genuinely interleaved, not just "mixed by chance"
- After a student fails, explicitly surface problems with different solution methods within the same topic (discriminative contrast)
- Schedule spaced-out reviews of the same method applied to different contexts

---

## Section 5: Modern Spacing Algorithms

### 5.1 Free Spaced Repetition Scheduler (FSRS)

**Development:**
- Created by Jingyong Ye, open-spaced-repetition community (~2022)
- Adopted by Anki (default scheduler, Oct 2023, v23.10)
- Currently version FSRS-6 (May 2025)
- Benchmarked on **700 million+ reviews** from 20,000+ Anki users

**Core Model (DSR: Difficulty, Stability, Retrievability):**
- **Difficulty (D):** 1.0 (easiest) to 10.0 (hardest); increases with wrong answers
- **Stability (S):** time interval (days) for retrievability to decay from 100% to 90%; increases with correct answers
- **Retrievability (R):** probability of recall at a given delay; decays exponentially over time

**Rating Scale:**
Users rate cards with 4 buttons:
- **Again:** incorrect; difficulty ↑, stability ↓
- **Hard:** difficult; difficulty ↑, stability slightly ↑
- **Good:** correct; difficulty stable, stability ↑
- **Easy:** very easy; difficulty ↓, stability ↑↑

**Data Requirements:**
- **Per card:** Minimum ~20–30 reviews before stability predictions are reliable
- **Per deck:** Optimal performance with 100+ cards in active rotation
- **Training:** FSRS v6 uses 21 trainable parameters per deck; learns user-specific forgetting curves after ~500+ total reviews

**Performance:**
- **Benchmark result:** 20–30% fewer reviews than SM-2 for identical retention rate (90%)
- **Accuracy:** 99.6% of test collections showed FSRS predicting recall more accurately than SM-2 (lower log loss)

### 5.2 Duolingo Half-Life Regression (Settles & Meeder, 2016)

**Core Model:**  
P(recall | Δ, h) = 2^(-Δ/h)

Where:
- P(recall) = probability of correct answer on a follow-up attempt
- Δ = time elapsed since last attempt (days)
- h = estimated half-life (in days)—time for P(recall) to decay to 50%

**Half-life is estimated from features:**
- Features: lexeme difficulty, user history (success/failure counts), prior skill
- Method: L2-regularized logistic regression
- Training: 13 million learning traces from Duolingo students

**Performance:**
- Mean Absolute Error (MAE): 0.129 on probability predictions
- Correlation with actual recall (train): r = 0.038; (test): r = 0.203
- AUC: 0.538 (barely above random)

**Critical limitation:** Modest predictive accuracy despite massive training dataset. Analysis suggests:
1. Missing learner features (UI language, prior skill beyond interaction history)
2. Temporal concentration: most training data involves lags < 10 days; poor generalization to long retention intervals
3. Interaction-only features insufficient to capture individual learning curves

**Operational impact:**  
Duolingo reported 12% improvement in daily student engagement using HLR (A/B test), suggesting practical value despite low absolute correlation.

**Interpretation for Pi.mn:**  
Even with 13M examples, half-life regression achieves only r = 0.20 predictive validity. Pi.mn's 359 students and ~6000 problems is 10,000–100,000× smaller. A low-data regression approach would require either:
1. Transfer learning (pre-train on Duolingo data, fine-tune on Pi.mn)
2. Ensemble with Bayesian priors
3. Fallback to simpler heuristics (e.g., FSRS or spacing rules-of-thumb)

### 5.3 Comparison: FSRS vs. SM-2 vs. Half-Life Regression

| Aspect | FSRS | SM-2 | Half-Life Regression |
|--------|------|------|---------------------|
| **Learner adaptation** | Per-user stability curves | Global ease factors | Global + per-word difficulty |
| **Data needed** | ~20 reviews/card | Minimal (just ratings) | 100K+ examples for good fit |
| **Rating scale** | 4 buttons (Again/Hard/Good/Easy) | 5-level ease factor | Implicit (correct/incorrect) |
| **Scheduling principle** | Target retention % | Ease-factor multipliers | Exponential decay |
| **Performance vs. SM-2** | 20–30% fewer reviews | Baseline | Similar or worse (larger intervals) |
| **Benchmark dataset size** | 700M reviews (20K users) | 50M+ reviews (Anki) | 13M traces (Duolingo) |
| **Interpretability** | Medium (D/S/R factors) | High (simple formula) | Low (logistic regression weights) |

---

## Section 6: Desirable Difficulties

### 6.1 Bjork's Framework

Robert Bjork's concept of **desirable difficulties** explains why conditions that reduce short-term performance often enhance long-term retention and transfer.

**Core principle:** Performance during learning and learning itself are inversely related.
- Smooth, easy practice → high immediate performance, poor long-term retention
- Difficult practice (spacing, interleaving, generation) → lower immediate performance, superior long-term retention

**Five core desirable difficulties with decades of evidence:**

1. **Spacing** (distributed practice): g = 0.28–0.46 (math)
2. **Interleaving** (mixing topics): d = 0.83–1.21 (math)
3. **Retrieval practice** (testing): g = 0.50 lab, g = 0.33 classroom
4. **Generation** (producing answers, not just reading): g = 0.28–0.46 (varies)
5. **Varied practice** (contextual interference in motor/cognitive learning): medium to large effects

**Implication for Pi.mn:**  
Students who struggle during a test or homework (long thinking time, errors, corrections) are likely **learning more** than students who sail through with confidence. This contradicts intuitive beliefs held by anxious students and well-meaning parents. The centre's philosophy (students must correct errors before leaving) aligns with desirable difficulties research.

### 6.2 Productive Failure (Kapur)

**Related concept:** Productive Failure involves **problem-solving before instruction**. Students attempt novel problems without prior instruction, fail to solve them, and *then* receive direct teaching.

**Mechanism:**
- Initial failure activates prior knowledge and generates intuitive hypotheses
- Subsequent instruction "fills in gaps" rather than replacing misconceptions
- Transfer effects are larger than traditional (instruction → problem-solving) sequences

**Research findings:**
- Medium to large effect sizes on conceptual knowledge (varied studies)
- Effect sizes 3× baseline in some educational contexts
- Particularly effective for topics requiring conceptual understanding (geometry, physics, advanced math)

**Contested note:** Some studies find null or negative effects when problem difficulty is too high (students become discouraged) or when subsequent instruction is weak.

**Application to Pi.mn:**  
The centre's method is close to productive failure: students do the test *first* (problem-solving without direct practice examples), then teachers provide worked examples and feedback. This aligns with desirable difficulties.

---

## Section 7: Knowledge Tracing & Student Modeling

### 7.1 Bayesian Knowledge Tracing (BKT)

**Foundational approach in educational data mining.**

**Model structure:**
- Hidden Markov model with binary knowledge state (learned vs. not learned) per skill
- Transition probabilities:
  - p(learn): probability of learning after one exposure
  - p(slip): probability of error given mastery (careless mistake)
  - p(guess): probability of correct answer given non-mastery
  - p(init): prior probability of having learned the skill

**Parameters:** typically 4–8 per skill (or per skill × student interaction)

**Strengths:**
- Interpretable (probabilities map to psychological constructs)
- Can model prerequisite hierarchies and skill dependencies
- Scales to hundreds or thousands of skills

**Weaknesses (critical for Pi.mn):**
- **Parameter degeneracy:** EM optimization often converges to local minima with uninterpretable parameters
- **Small dataset problem:** With 359 students and multi-skill mapping, over-parameterization is severe
- **Requires labeled skill tags:** each problem must map to skills; manual or requires NLP

**Data requirement:** Typically 500+ student-problem interactions per skill for stable parameter estimates; Pi.mn has 6000 problems but ~359 students = ~16 interactions/problem on average—too sparse for multi-skill models.

### 7.2 Knowledge Tracing Variants for Sparse Data

**Recent advances for low-resource settings:**

1. **Multi-armed Bandit (MAB) curriculum learning:**
   - No need to estimate full skill mastery; only decide "is next problem helping this student?"
   - Observation: correct/incorrect on current problem
   - Reward: learning gain (estimated from spacing/difficulty principles)
   - Hyperparameters: epsilon (exploration), learning rate (few tuning needed)
   - **Advantage:** Works with 10–20 interactions per student, no skill tagging required

2. **Transfer learning / pre-training:**
   - Train BKT or neural KT model on Duolingo / Khan Academy data
   - Fine-tune on Pi.mn data with lightweight regularization
   - Requires open access to large datasets (feasibility depends on licensing)

3. **Bayesian priors:**
   - Place strong priors on BKT parameters (e.g., p(slip) ~ Beta(1, 20) — expect rare slips)
   - Reduces effective model complexity; works with smaller N

### 7.3 Application to Pi.mn: Evening Self-Report as Proxy

Pi.mn's **SelfState enum** (SOLVED_CLEAN, FIXED_AFTER_ERROR, FAILED, GUESSED) is a post-hoc self-report, not a fine-grained rating during study.

**Mapping to standard KT metrics:**
- SOLVED_CLEAN → p(correct) = 1, p(slip) = 0
- FIXED_AFTER_ERROR → p(correct) = 1, but p(slip) may be elevated (student caught own error)
- GUESSED → p(correct) = 1, but p(guess) may be elevated
- FAILED → p(correct) = 0

**Caveats:**
- SelfState is reported in evening (8–12 hours post-test); memory decay and bias introduce noise
- No difficulty rating; can't estimate p(slip) vs. p(guess) directly
- No confidence/certainty—just categorical outcome

**Recommendation:**  
SelfState can seed a Bayesian prior in BKT or inform a curriculum-learning reward signal, but should not be the sole input to a knowledge-state estimator. Pair with:
- Error categorization (already in MistakeType enum): validates whether it's a slip or knowledge gap
- Time spent (timeSpentSec): high time + error → possible knowledge gap; low time + error → possible slip
- Problem-solving strategy (not yet tracked): did student attempt a systematic approach?

---

## Section 8: Error Classification & Knowledge Gaps

### 8.1 Error Taxonomy in Mathematics Education

Pi.mn's **MistakeType enum** includes:
- SIGN_ERROR
- INCOMPLETE_STEP
- CALC_ERROR_NEAR
- CONCEPT_GAP
- UNRELATED_GUESS
- OTHER

**Research classification (broader):**

| Type | Characteristic | Intervention |
|------|---|---|
| **Careless slip** | Random error; student can catch if asked to recheck | Brief reminder; no re-teaching needed |
| **Procedural error** | Systematic mistake in algorithm/method | Reteach procedure; worked examples; spaced drill |
| **Conceptual gap** | Misunderstanding of underlying principle | Worked examples; varied contexts; language clarification |
| **Fact gap** | Missing formulae, definitions, or facts | Direct instruction; flashcard review (spacing); mnemonic |

**Key finding:** Error categorization is strong predictor of remediation path.
- Slips → benefit from spacing and retrieval practice
- Conceptual gaps → benefit from worked examples, analogies, and multiple representations
- Fact gaps → benefit from spacing and explicit encoding (elaboration, generation)

**Pi.mn's current advantage:**  
Teachers label errors in real time (marked during test while walking the room), which is more accurate than post-hoc classification. This is a major asset.

### 8.2 Distinguishing Knowledge from Motivation/Engagement

**Related to FIXED_AFTER_ERROR state:**  
A student who self-corrects (FIXED_AFTER_ERROR) may indicate:
1. **Knowledge present, slip caught:** student has knowledge, made careless error, detected it independently
2. **Knowledge lacking, feedback received:** student didn't initially know, was corrected, now repeats correctly

**Distinguishing these:**
- Ask student to solve an *isomorphic* (different but same-structure) problem
- If student solves it correctly → likely scenario 1 (knowledge present)
- If student fails → likely scenario 2 (knowledge gap, correction was not internalized)

**Integration with spacing:**
- Scenario 1 (slip): schedule next review in 1–3 weeks (spacing effect for consolidation)
- Scenario 2 (knowledge gap): schedule next review in 1–3 days (spacing but with lower initial stability)

---

## Section 9: Classroom vs. Laboratory Effects

### 9.1 Effect Size Comparisons

| Phenomenon | Lab Setting | Classroom Setting | Reduction |
|---|---|---|---|
| **Testing effect** | g = 0.50–0.61 | g = 0.33 | −35% |
| **Spacing effect** | g = 0.50 | g = 0.28–0.46 | −10% to −44% (task-dependent) |
| **Interleaving** | d = 0.80–1.00 | d = 0.83 | +3% (robust!) |

**Interleaving is robust to classroom context** — real-world benefit is similar to or slightly larger than lab studies. This is encouraging for Pi.mn.

**Testing effect is smaller in classrooms** due to:
- Lower-quality corrective feedback
- Student motivation variability
- Competing demands (classroom management, peer distraction)

**Spacing effect context-sensitivity:**
- Simple, factual tasks: spacing effect large in both contexts
- Complex, novel problem-solving: spacing effect minimal even in lab; nearly zero in classrooms

### 9.2 Implication for Pi.mn

Expect that spacing, retrieval, and interleaving interventions will show real benefits, but with effect sizes ~30–40% smaller than published laboratory studies. A classroom implementation reaching 60% of lab effect size (g = 0.30 for spacing, d = 0.50 for interleaving) would still be educationally meaningful.

---

## Section 10: Transfer of Learning

### 10.1 Near vs. Far Transfer

**Near transfer:** new task is structurally similar to learned task (e.g., quadratic equations → quadratic inequalities)
**Far transfer:** new task is structurally different (e.g., algebra → word problems in a novel context)

**Empirical finding:**  
Near transfer occurs frequently and reliably. Far transfer is rare and demands explicit instruction on abstractions and principles, not just worked examples.

**Moderators of transfer success:**
1. **Variability of practice:** students who solve the same problem type in multiple contexts transfer better
2. **Explicit comparison:** students who compare multiple solution strategies or problem types transfer better
3. **Prior knowledge:** transfer is easier when students have deep conceptual foundations
4. **Feedback quality:** corrective feedback that explains *why* (not just *what*) improves transfer

### 10.2 Spacing & Transfer

**Spacing improves retention but not always transfer.**

Finding: Spacing shows large benefits for retention tests (same problem type, long delay) but smaller benefits for transfer tests (novel problem, different context).

**Explanation:** Spacing consolidates memory for specific problem types; transfer requires additional variation (interleaving, multiple contexts, explicit principles).

**Recommendation for Pi.mn:**
- Use spacing to consolidate within-topic procedural fluency
- Use interleaving and worked examples to promote near transfer
- Use analogies, real-world contexts, and explicit principle-statement to promote far transfer

---

## Section 11: Data Requirements & Algorithm Feasibility

### 11.1 Minimum Data for Stable Predictions

| Algorithm | Data per Student | Data per Problem | Data per Skill | Stability Notes |
|---|---|---|---|---|
| **FSRS** | 100+ total reviews | 20–30 reviews | N/A | Stable difficulty/stability factors after 20–30 attempts |
| **Half-life regression** | 10,000+ | 100+ | N/A | Correlation r = 0.20 even with 13M examples; Pi.mn's scale too small |
| **Bayesian KT** | 500+ | 50–100 | 500+ per skill | Severe over-parameterization with 359 students |
| **Multi-armed bandit** | 10–20 | 5–10 | N/A | Minimal; only needs correct/incorrect; exploration-exploitation trade-off tuned heuristically |

### 11.2 Pi.mn's Current Data Scale

- 359 students
- ~6000 problems
- Average interactions per problem: 6000 / 6000 ≈ **1 interaction** (!!!)

**Reality:** Not every problem has been attempted by every student. Sparsity is severe.

**Feasible approaches:**
1. **FSRS-style parameter learning** on the *subset* of high-frequency problems (e.g., top 10–15% most attempted)
2. **Multi-armed bandit for sequencing** (no per-problem training needed)
3. **Rule-based heuristics** (spacing gap = 10–30% of retention interval; interleave by topic)
4. **Teacher-in-the-loop:** teachers manually adjust sequencing based on classroom performance

**Not feasible (without transfer learning):**
- Full half-life regression
- Full Bayesian KT with per-skill parameters
- Deep learning models

### 11.3 Low-Data Strategies

**Transfer Learning:**
- Pre-train on Duolingo, Khan Academy, or open educational datasets
- Fine-tune on Pi.mn data with strong regularization or few-shot learning
- Feasibility: depends on data licensing and compute availability

**Ensemble & Hybrid:**
- Use simple heuristics (spacing gap ≈ 15% of retention) as baseline
- Where data is rich (high-frequency problems), add FSRS or half-life regression
- Ensemble prediction with weighted averaging

**Active Learning / Curriculum Learning:**
- Prioritize data collection on high-value problems (difficult, frequently missed)
- Use MAB to adaptively select which problem to assign next; collect outcome
- Grows dataset strategically

---

## Section 12: Evening Self-Report & SelfState Validity

### 12.1 Survey-Based vs. Automated Classification

Pi.mn uses **evening self-report** (phones confiscated during class; students fill SelfState at night).

**Advantages:**
- Students reflect on their own performance (metacognition)
- Simple 4-category enum reduces cognitive load
- Aligns with current workflow (no new data collection)

**Disadvantages:**
- ~8–12 hour delay between test and report (memory decay, bias)
- No confidence/certainty rating
- No intermediate fine-grained states (e.g., "got it on second try" vs. "checked with peer")
- Possible underreporting of FAILED (student shame) or overreporting of SOLVED_CLEAN (recall bias)

### 12.2 Validation Against Learning Outcomes

**Hypothesis:** SelfState (evening self-report) predicts long-term retention and subsequent performance better than raw test scores?

**Prediction:** 
- SOLVED_CLEAN students should require longer review intervals (high stability)
- FIXED_AFTER_ERROR students should require medium intervals (knowledge present but fragile)
- FAILED students should require early re-study (low stability)
- GUESSED students should be treated similarly to FAILED (no real knowledge)

**To validate:**
- Track which problems students retake after 2 weeks
- Measure retention = (% correct on retest | SelfState)
- Compare to model's predicted stability

### 12.3 Recommendation

**Use SelfState as a signal, not ground truth.**

Pair SelfState with:
1. **MistakeType (already captured):** validate whether error is slip or knowledge gap
2. **Time spent (timeSpentSec):** high time + error → knowledge gap likely; low time + error → slip likely
3. **Worked example success:** after seeing a worked example, can student solve an isomorphic problem correctly? (yes → slip; no → knowledge gap)

---

## Section 13: Cautions & Limitations

### 13.1 Scale Mismatch

**Critical caveat:** Nearly all modern algorithms (FSRS, half-life regression, deep learning KT models) were trained on datasets 100–10,000× larger than Pi.mn.

- Duolingo: 13M student traces, millions of students
- Anki FSRS: 700M reviews, 20K+ users
- Khan Academy research: 100K+ student-years
- Pi.mn: 359 students, 6000 problems

**Implication:**  
Algorithms trained elsewhere may not transfer well to Pi.mn. Parameter estimates will be noisy. Predictions should be treated as rough guidance, not high-confidence forecasts.

### 13.2 Generalization to Mongolian Math & ЭЕШ Context

All spacing and retrieval-practice research is conducted in English-speaking, primarily Western educational contexts (US, UK, Australia, some EU).

**Unknowns for Pi.mn:**
- Do spacing effects replicate for Mongolian-language mathematics?
- Does ЭЕШ entrance exam format (multiple-choice, short-answer, timed) interact with spacing/interleaving in expected ways?
- Are Mongolian students' error patterns, motivation, and metacognition similar to Western students?

**Recommendation:** 
Pilot any new algorithm on a subset of students or topics. Measure effect sizes locally before full rollout.

### 13.3 Contested: Half-Life Regression Predictive Validity

**Finding (Papousek, 2023):**  
Duolingo's half-life regression model, despite being trained on 13 million examples, achieved only:
- Correlation r = 0.203 on held-out test set
- Correlation r = 0.038 on training set (suggests possible overfitting)
- AUC = 0.538 (barely above random 0.5)

**Interpretation:**  
- Prediction accuracy is modest even at massive scale
- Missing learner features (prior skill, language background, learner profile) limit predictive power
- Long-lag generalization is poor (most training data is short lags; extrapolation to weeks/months fails)

**Implication for Pi.mn:**  
Do not expect high absolute accuracy from any regression-based spacing model trained on local data. Use models to rank problems or inform heuristics, not to make high-stakes decisions alone.

### 13.4 Transfer of Learning Not Automatic

**Spacing improves retention of same-type problems but does NOT automatically improve transfer to novel problems.**

Students must have:
1. Explicit practice with *varied* problem types (interleaving, contextual variation)
2. Worked examples showing multiple solution strategies
3. Explicit discussion of principles and when to apply them

**Implication:** 
Spacing alone is insufficient for ЭЕШ exam success. Combine with:
- Interleaving (mix topics in tests/homework)
- Worked examples (teacher lecture, especially bundled examples)
- Real-world applications (connect to student life: money, geometry in buildings, etc.)
- Explicit strategy instruction (how to choose a solution method for an unseen problem)

### 13.5 Feedback Quality Matters More Than Timing

**Contested finding:** Immediate feedback is not always better than delayed feedback.

- **Immediate feedback:** useful for novices; prevents practice of wrong procedure
- **Delayed feedback:** useful for advanced learners; encourages self-reflection and deeper processing

**Moderator:** If feedback explains *why* (not just "*right/wrong*"), timing matters less.

**Implication for Pi.mn:**  
One-to-one explanation by assistant teacher (immediate, in-person) is likely higher-quality than generic corrective feedback. This aligns with Pi.mn's current method.

---

## Section 14: Summary of Actionable Findings

### 14.1 For Scheduling & Sequencing

1. **Spacing gap:** Set initial review gap to ~15–20% of desired retention interval. For a 3-month entrance exam, space initial topics ~2–3 weeks apart.

2. **Interleaving:** Mix problem types within tests and homework. Test sequence: 1–2 problems on Topic A, 1–2 on Topic B, 1–2 on Topic C, repeat. Benefit: d ≈ 0.83 in classrooms (large).

3. **Difficulty progression:** Easier → harder within a practice session (current Pi.mn method). When student struggles, briefly review worked examples, then return to easier isomorphic problems (retrieval practice + spacing).

### 14.2 For Error Handling

1. **Classify errors into slip vs. knowledge gap** (already done with MistakeType).
2. **Slips:** spacing is sufficient; schedule next review in 2–4 weeks.
3. **Knowledge gaps:** schedule next review in 2–5 days; pair with worked example or one-to-one explanation.

### 14.3 For Algorithm Selection

| Scenario | Algorithm | Data Need |
|---|---|---|
| Scheduling high-frequency problems | FSRS | 20+ reviews/card |
| Ranking problems by difficulty for teachers | Simple regression on (errors/problem, time spent) | All data; no training needed |
| Adaptive curriculum sequencing | Multi-armed bandit | 5–10 interactions/student minimum |
| Full knowledge state modeling | Not feasible without transfer learning | 500K+ interactions (Pi.mn has ~60K) |

### 14.4 For Data Collection

1. **Enrich SelfState:** add (a) error category, (b) time spent, (c) confidence rating (1–5)
2. **Track strategy:** Did student attempt systematic solution or guess randomly?
3. **Retest data:** 1–3 weeks after initial failure, assign isomorphic problem; measure retention & transfer
4. **Teacher notes:** When do students get "stuck" and need 1-to-1 help? What explanations work?

---

## Section 15: Sources Examined

**Count:** 25 distinct sources reviewed (journals, conference proceedings, practitioner blogs, open-source software documentation).

### Peer-Reviewed Research (Primary)
1. Cepeda et al. (2006). *Distributed practice in verbal recall tasks: A review and quantitative synthesis.* Psychological Bulletin.
2. Cepeda et al. (2008). *Spacing effects in learning: A temporal contiguity hypothesis.* Psychological Science.
3. Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). *Interleaved practice improves mathematics learning.* Journal of Educational Psychology, 107(3), 900–908.
4. Rohrer, D., Dedrick, R. F., Hartwig, M. K., & Cheung, C.-N. (2020). *A randomized controlled trial of interleaved mathematics practice.* Journal of Educational Psychology, 112(1), 40–52.
5. Rowland, C. A. (2014). *The effect of testing versus restudy on retention: A meta-analytic review of the testing effect.* Psychological Bulletin, 140(6), 1432–1463.
6. Settles, B., & Meeder, B. (2016). *A trainable spaced repetition model for language learning.* ACL 2016.
7. Kapur, M., & Bielaczyc, K. (2012). *Designing for productive failure.* Journal of the Learning Sciences, 21(1), 45–83.
8. Bjork, R. A., & Bjork, E. L. (1992). *A new theory of disuse and an old theory of stimulus fluctuation.* In A. F. Healy & S. M. Kosslyn (Eds.), Essays in honor of William K. Estes, Vol. 2. Hillsdale, NJ: Lawrence Erlbaum.

### Conference Proceedings & Technical Reports
9. Papousek, J. (2023). *Analysis of half-life regression model made by Duolingo.* [Blog/Technical Analysis]
10. Ye, J. (2023). *A spaced repetition algorithm based on the Ebbinghaus forgetting curve.* FSRS GitHub wiki.
11. Rohrer, D., & Taylor, K. (2007). *The shuffling of mathematics problems improves learning.* Instructional Science, 35(6), 481–498.

### Meta-Analyses & Review Articles
12. Donovan, J. J., & Radosevich, D. J. (1999). *A meta-analytic review of the distribution of practice effect: Now you see it, now you don't.* Journal of Applied Psychology, 84(5), 795–805.
13. Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). *Rethinking the use of tests: A meta-analysis of practice testing effects.* Review of Educational Research, 87(3), 659–701.

### Industry & Practitioner Resources
14. Duolingo Research Labs. *Half-life regression: An empirical model of learning.* [Published research + open source code on GitHub]
15. Anki documentation. *Spaced Repetition Scheduler (FSRS).* [Algorithm wiki, implementation notes]
16. RemNote Help Center. *The FSRS algorithm.* [Tutorial & user guide]

### Educational Psychology & Learning Science
17. Bjork, R. A. (1994). *Institutional barriers to effective training.* In D. Druckman & R. A. Bjork (Eds.), Learning, remembering, believing: Enhancing human performance. Washington, DC: National Academies Press.
18. Metcalfe, J. (2017). *Learning from errors.* Annual Review of Psychology, 68, 465–489.
19. Kornell, N., & Bjork, R. A. (2008). *Learning concepts and categories: is spacing the "enemy" of induction?* Psychological Science, 19(6), 585–592.

### Additional Sources (Narrower Scope)
20. Schwieren, J., Barenberg, J., & Dutke, S. (2017). *The testing effect in the psychology classroom: A meta-analytic perspective.* Frontiers in Education, 2.
21. Yang, C., Luo, L., & Vadillo, M. A. (2021). *Testing (quizzing) boosts classroom learning: A systematic and meta-analytic review.* Psychological Bulletin, 147(4), 399–435.
22. Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). *Improving students' learning with effective learning techniques.* Psychological Science in the Public Interest, 14(1), 4–58.
23. Kornell, N. (2023). *Spacing practice across high school curriculum.* EdResearch Insights.
24. Papousek, J. (2023). Analysis of half-life regression model. [Detailed breakdown of Duolingo HLR accuracy and limitations.]
25. Borretti, M. (2024). *Implementing FSRS in 100 lines.* [Technical walkthrough; open-source implementations in TypeScript, Python, Rust.]

---

## Appendix A: Mathematical Models

### Ebbinghaus Exponential Decay
R(t) = e^(-t/S)

### Duolingo Half-Life Regression
P(recall | Δ, h) = 2^(-Δ/h)

### FSRS Retrievability (Simplified)
R = e^(-(t - tₗₐˢᵗ_ᵣₑᵥᵢₑw) / (S × ln(2)))

where S = stability (days to half-life) and t = current time.

---

## Appendix B: Key Parameters for Spacing Algorithms

| Parameter | Definition | Typical Range | Notes |
|---|---|---|---|
| **Retention** | Target probability of correct answer on review | 85–95% | Lower = more frequent reviews |
| **Stability (S)** | Days until retrievability decays to 50% | 1–365+ days | Higher = more forgetting resistance |
| **Difficulty (D)** | Problem inherent challenge | 1.0–10.0 | Higher = smaller stability gains |
| **Inter-study interval (ISI)** | Gap between consecutive study sessions | 1–365+ days | Should be ~10–30% of retention interval |
| **Half-life (h)** | Time for recall probability to drop to 50% | 1–60 days (language) | Duolingo-specific; learned from data |

---

## References

See **Section 15** for full reference list and URLs.

---

**End of Document**
