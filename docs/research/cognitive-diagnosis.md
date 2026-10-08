# Cognitive Diagnosis & Step-Level Error Attribution: Research Review

**Domain:** Educational Technology, Intelligent Tutoring Systems, Mathematics Learning  
**Context:** Pi.mn (Mongolian ЭЕШ prep tutoring, ~359 students, ~6000 problems, 13 teachers)  
**Scope:** Error attribution at the step level, misconception diagnosis, sparse-data modelling  
**Review Date:** August 2026

---

## Executive Summary

This review examines scientific literature on cognitive diagnosis models (CDMs), step-level error attribution, and misconception detection in mathematics tutoring. The Pi.mn context presents a classic sparse-data challenge: evening self-reports, teacher-labelled mistakes, and ~17 problems per student on average. This landscape favors:

1. **Q-matrix / DINA-family models** for binary skill mastery attribution (established, interpretable)
2. **Constraint-based modeling** for domain-specific rule violations (practical for algebra)
3. **Error taxonomies & distractor analysis** for misconception categorization (directly applicable)
4. **Graph-based CDMs** (RCD, newer NeuralCD variants) when prerequisite structure is known
5. **Knowledge tracing** (Bayesian or modern variants) for temporal mastery updates

Key caution: Deep neural models (NeuralCDM, etc.) typically need >100 observations per student to stabilize; Pi.mn has ~17. Sparse-data techniques (transfer learning, meta-learning, graph priors) show 3–6% accuracy gains on sparse datasets but require careful validation on Mongolian mathematics.

---

## I. Foundational Cognitive Diagnosis Models

### 1.1 DINA Model & Q-Matrix

**What It Does:**  
The Deterministic Inputs, Noisy "And" gate (DINA) model is a probabilistic latent-class model that estimates whether a student has mastered each of a set of knowledge attributes (skills). It requires a **Q-matrix**: an item × attribute binary matrix where q_ik = 1 if item i requires attribute k.

**How It Works:**
- Assumes a student must have mastered ALL required attributes to have a high probability of answering an item correctly.
- Produces a binary skill profile per student: [1,0,1,0] = mastered skills 1,3 but not 2,4.
- Assigns each wrong answer to missing skills based on which combination of attributes the Q-matrix says were needed.

**Data Requirements:**
- Minimum ~5–10 observations per student per skill cluster (varies by study, but sparse-data work shows degradation below 5–10).
- Q-matrix accuracy is critical: misspecification yields biased skill estimates.
- Works with binary correct/incorrect responses; no time or step-level data required.

**Advantages:**
- Transparent, interpretable output (which skills are missing).
- No deep learning; computationally lightweight.
- Extensive validation literature (since ~2010).

**Limitations:**
- Assumes conjunctive ("AND") skill requirements; real problems often have compensatory or mixed skill structures.
- Q-matrix hand-coding is labour-intensive.
- Does not distinguish careless errors from true skill gaps.

**Pi.mn Fit:** **GOOD** for initial baseline. The evening self-reports (SOLVED_CLEAN, FIXED_AFTER_ERROR, FAILED, GUESSED) provide behavioral context that DINA can anchor to. Hand-coding 6000 problems' Q-matrices would require ~2–4 weeks of teacher time but is one-time work.

---

### 1.2 GDINA (Generalized DINA) Model

**What It Does:**  
A flexible generalization of DINA that relaxes the strict "AND" assumption, allowing each attribute to contribute differently to item success probability. Compensatory (some attributes can substitute for others) and mixed models are special cases.

**Data Requirements:**
- Similar to DINA: ~5–10 per student per skill.
- Larger Q-matrix possible because it can infer attribute weights.

**Advantages:**
- Subsumes DINA, DINO, and many other models as special cases.
- More accurate when skill requirements are actually compensatory.
- R/Python packages available (GDINA, CDM).

**Limitations:**
- Requires more data than DINA to estimate attribute weights reliably.
- Still requires a Q-matrix (not automated discovery).

**Pi.mn Fit:** **MODERATE GOOD**—stepwise upgrade from DINA if initial DINA fits are poor.

---

### 1.3 Knowledge Tracing (Bayesian & Modern Variants)

**What It Does:**  
Models the *temporal* evolution of student skill mastery using a Hidden Markov Model (Bayesian Knowledge Tracing, BKT) or deep networks (Deep Knowledge Tracing). Estimates P(mastery | all prior attempts).

**Data Requirements:**
- Sequence of correct/incorrect responses over time.
- BKT: 4–5 parameters per skill; needs ~20 observations per skill to stabilize.
- Deep variants: can use 100s or 1000s of students but need rich features (time, hints, etc.).

**Advantages:**
- Naturally models learning over time.
- BKT is simple and interpretable.
- Bridges episodic attempts to cumulative mastery.

**Limitations:**
- Assumes independence of attempts (violated when students learn from feedback mid-problem).
- Deep variants are black-box and require large datasets.
- Does not pinpoint *which step* failed.

**Pi.mn Fit:** **MODERATE**. Evening self-reports provide coarse temporal signal (each night), but the confounded self-state (GUESSED vs. FAILED vs. FIXED) limits precision. Could augment DINA.

---

## II. Step-Level Error Attribution & Constraint-Based Modeling

### 2.1 Constraint-Based Modeling (Ohlsson, Mitrovic)

**What It Does:**  
Instead of modelling correct problem-solving paths, CBM models the *constraints* that a correct solution must satisfy. When a student's answer violates a constraint, the system flags which constraint was broken—hence which concept or rule is missing.

**Example (Algebra):**
- Constraint: "Do not add exponents when multiplying powers of the same base; instead, multiply the coefficients."
- Student writes: 2x² · 3x³ = 6x⁶ (violates the constraint: added 2+3 instead of multiplying 2·3).
- System infers: student does not know the exponent rule.

**Data Requirements:**
- Domain constraints must be hand-authored (expert knowledge engineering).
- Works with a single response per item (no need for many attempts).
- Minimal training data: ~10–20 students to tune feedback wording.

**Advantages:**
- **Step-level diagnosis without detailed logs**—if student writes wrong answer, CBM can often pinpoint which rule was violated.
- Few parameters; works in sparse-data settings.
- Deployed successfully in SQL-Tutor, geometry, programming.
- Directly addresses Pi.mn's core request: "AT WHICH STEP did it break?"

**Limitations:**
- Requires domain expert to write constraints (upfront labour).
- Cannot handle truly novel errors (only flagged violations of known constraints).
- Assumes error = single constraint violation (real errors often involve cascades).

**Pi.mn Fit:** **EXCELLENT** for algebra, particularly if algebra content is stable (2–3 textbooks). Teachers could co-author ~50–100 constraints for the most common algebra error patterns. Pilot on one chapter to validate.

---

### 2.2 Buggy Rules & Misconception Libraries

**Background:**  
The BUGGY system (Brown & Burton, 1978) and later Mal-rules (Payne & Squibb, 1990) encoded common *wrong* procedures as "bugs"—coherent but incorrect algorithms. For example:

- **Bug:** "When dividing fractions, flip the divisor" (correct) "and then add the numerators instead of multiplying" (buggy).
- **Result:** (1/2) ÷ (1/3) → student writes 1+3 / 2 = 2 instead of 3/2.

**Modern Implementations:**
- **MalruleLib**: Large-scale library of 50+ executable algebra misconceptions, each with step-by-step solution traces.
- **MalAlgoPy**: Python graph-based generator of linear-equation solution paths, including 22 documented misconceptions (distribution errors, sign errors, parentheses handling).

**Data Requirements:**
- Hand-authored misconceptions (labour-intensive but reusable).
- Labelled examples to validate which buggy rule applies (~50–100 per misconception).

**Advantages:**
- Directly models HOW a student arrives at a wrong answer, not just THAT it's wrong.
- Automated "tracing" of student work against a library of bugs.
- Separate "doesn't know" from "knows but applies wrong rule."

**Limitations:**
- Bug library is finite; novel errors fall through.
- Requires transcription of student work step-by-step (not just final answer).
- Labor-intensive to author and validate.

**Pi.mn Fit:** **GOOD** for retrospective analysis of evening self-reports. Teachers already label MistakeType (SIGN_ERROR, INCOMPLETE_STEP, CALC_ERROR_NEAR, CONCEPT_GAP, UNRELATED_GUESS, OTHER). A buggy-rules library could systematize and extend this. Start with ~10 most common mistakes; grow incrementally.

---

## III. Error Taxonomies & Misconception Detection

### 3.1 Error Classification Approaches

Research distinguishes:
1. **Procedural errors**: Wrong execution of a known rule (e.g., arithmetic slip).
2. **Conceptual errors**: Misunderstanding a concept (e.g., thinking negative × negative = negative).
3. **Careless errors**: Knows the correct method but makes a slip (time pressure, distraction).

**Automated Classification Methods:**
- **Rule-based**: Hand-written rules (e.g., "if student wrote –2x instead of 2x, flag SIGN_ERROR").
- **Machine Learning**: Train classifier on teacher-labelled errors; can generalize to unseen errors.
- **Large Language Models**: Flexible zero-shot classification; can explain errors in natural language.

**Data Requirements:**
- Rule-based: ~50 examples per error type to refine rules.
- ML classifier: ~200–500 labelled errors to train reliably.
- LLM: ~10–20 few-shot examples; generalizes well but may hallucinate categories.

**Research Finding:**  
LLM-based classifiers outperform rule-based methods on unseen algebra errors, but require validation on Mongolian context (math terminology, common local mistakes).

**Pi.mn Fit:** **MODERATE GOOD**. Teachers already assign MistakeType by hand. A hybrid approach (rule-based baseline + LLM for ambiguous cases) could reduce teacher labeling burden by 20–40%.

---

### 3.2 Distractor Analysis & Misconception Mapping

**What It Does:**  
In multiple-choice questions, each incorrect option (distractor) is designed to embody a specific misconception. By analyzing which distractors students select, we infer their misconceptions.

**Example (Mathematics):**
- Question: What is (3x + 2)(x – 1)?
- A) 3x² + x – 2 (correct)
- B) 3x² – 1 (wrong: forgot middle term; misconception: lost distributive middle cross-term)
- C) 3x² – 3x + 2x – 2 = 3x² – x – 2 (wrong: sign error on last term)
- D) 3x + 2 + x – 1 = 4x + 1 (wrong: treated as addition instead of multiplication)

**Data Requirements:**
- Expert-authored distractors (upfront design).
- Pilot testing to confirm distractors actually capture intended misconceptions (~50 students).

**Advantages:**
- Directly reveals misconception from choice, not just "wrong answer."
- Non-intrusive; works with existing MC assessments.
- Distractor designs are reusable across years.

**Limitations:**
- Requires test redesign; cannot retrofit onto existing open-response tests.
- Clever students may guess correctly despite misconceptions.

**Pi.mn Fit:** **MODERATE**. Pi.mn uses MC tests. Could selectively redesign distractors on a few high-stakes topics (quadratic equations, logarithms, trigonometry) to validate misconceptions. Low effort if tests are digital.

---

## IV. Misconception & Error Discovery from Data

### 4.1 Automatic Misconception Discovery

**Approach:**  
Given a set of wrong answers to an item, cluster or classify them to infer common misconceptions students share.

**Methods:**
- **Distractor clustering**: If many students select the same wrong answer, likely a common misconception.
- **NLP on open-response**: Parse student explanations; identify recurring phrases ("I added the exponents").
- **Symbolic execution**: If students submit work step-by-step, trace backward to identify the buggy rule applied.

**Data Requirements:**
- ~100–500 wrong answers per item to reliably infer misconceptions.
- Open-response or step-level work (not just final answers).

**Advantages:**
- Discovers misconceptions from data rather than expert guessing.
- Validates whether designed distractors actually work.

**Limitations:**
- Requires rich data (e.g., step traces); evening self-reports alone are insufficient.
- Can conflate rare mistakes with true misconceptions.

**Pi.mn Fit:** **MODERATE GOOD** for retrospective analysis. If Pi.mn moves to online step-level testing (currently classroom OMR), this becomes powerful. For now, can use evening self-reports + teacher labels to seed misconception hypotheses.

---

## V. The Eedi Dataset & NeurIPS 2020 Challenge

### 5.1 Overview

**What:**  
Eedi is an online math tutoring platform that released a dataset of 20+ million student responses to 1,857 K–12 multiple-choice math questions. Each question has 4 expert-authored distractors, each embodying a specific misconception.

**Key Dataset Properties:**
- 1,857 math questions (K–12, mixed topics).
- 4 multiple-choice options per question; distractors are misconception-aligned.
- 20+ million response records (students × questions).
- Sparse: most students attempt only ~50–200 questions (< 11% coverage).
- Noisy: some students guess; no forced explanation of reasoning.

**NeurIPS 2020 Challenge Tasks:**
1. Predict which answer a student will choose (accuracy).
2. Predict question quality (does it discriminate well?).
3Recommend a personalized sequence of questions.

**Key Finding:**
Distractor-aligned multiple-choice data + misconception labels are powerful for:
- Inferring skill gaps (which misconception does this student hold?).
- Detecting misconception prevalence (% of students with each misconception).
- Personalization (serve next question to probe the detected gap).

**Data Hunger:**  
Competitor models were trained on 14+ million response records (test on ~6 million). Neural models needed 100K+ students to stabilize. Simpler approaches (Bayesian, neighborhood-based) worked with 50K students.

**Pi.mn Relevance:** **MODERATE**. Eedi's dataset is useful for benchmarking and understanding state-of-the-art, but Pi.mn's evening self-reports are much sparser (no forced multiple-choice selection, no timestamp per problem). However, Eedi's misconception-distractor framework is directly applicable if Pi.mn tests are MC.

---

## VI. Sparse-Data Challenges & Solutions

### 6.1 The Sparsity Problem

**What:**  
Online learners engage selectively with items. A typical student attempts many problems but only ~11% of possible problems. This creates a sparse student-concept matrix:

| Student | Concept A | Concept B | Concept C |
|---------|-----------|-----------|-----------|
| S1      | 0.8       | ?         | ?         |
| S2      | ?         | 0.6       | ?         |
| S3      | ?         | ?         | 0.7       |

**Why It Matters:**
- Standard CDMs assume dense data (each student attempts each skill multiple times).
- Sparse data → high variance in skill estimates; risk of overfitting.

**Pi.mn Case:**
- 359 students × ~6000 problems = 2.1M cells.
- Actual attempts: ~359 × 17 ≈ 6,100 cells (~0.3% density).
- **Extreme sparsity.**

### 6.2 Solutions for Sparse Data

**Approach 1: Knowledge Graphs as Priors**  
Encode prerequisite structure (e.g., "addition is prerequisite to multiplication") as a Bayesian network. Use this as a soft constraint during CDM fitting.

- **Effect:** ~3–6% accuracy improvement on sparse datasets.
- **Data needed:** Domain expert to draw prerequisite graph (1–2 days per 20 concepts).

**Approach 2: Transfer Learning**  
Train a CDM on one discipline (e.g., algebra), then fine-tune on another (e.g., Mongolian ЭЕШ algebra). Newer models (TLCD, PromptCD) use deep networks to share structure across domains.

- **Effect:** 4–8% improvement when source domain is similar.
- **Data needed:** Large source dataset (e.g., Khan Academy logs); moderate target dataset.

**Approach 3: Meta-Learning**  
Train a "learner of learners" that rapidly adapts to new students with few observations. Emerging approach (MetaCD).

- **Effect:** Promising in theory; not yet validated at scale.
- **Data needed:** 1000+ students to train the meta-model; then 5–10 observations per new student.

**Approach 4: Graph Neural Networks (GNNs)**  
Model students, concepts, and exercises as a graph; use message-passing to infer missing skill levels. RCD and newer variants (e.g., self-supervised CD) use this.

- **Effect:** 2–5% improvement on sparse data; stabilizes with 5–10 observations per student.
- **Data needed:** Knowledge graph (which exercises target which concepts); can be inferred from content structure.

**Pi.mn Recommendation:**
1. **Start:** Knowledge graph prior (prerequisite structure). Feasible in 1–2 weeks with teacher input.
2. **Validate:** Compare GDINA with vs. without graph prior on a subset of Pi.mn data.
3. **Extend:** If GDINA+graph stabilizes within acceptable error bounds (~±0.05 probability), proceed. If not, consider transfer learning (import a model trained on Khan Academy + Mongolian ЭЕШ prep data).

---

## VII. Knowledge-Learning-Instruction Framework (Koedinger et al.)

### 7.1 Overview

**What:**  
KLI is a framework for instructional design that aligns three elements:
1. **Knowledge Components (KCs)**: The skills/concepts students must master.
2. **Learning Processes**: How learning happens (e.g., memory building, induction, sense-making).
3. **Instructional Principles**: Methods to facilitate learning (e.g., worked examples, spacing, testing).

**Relevance to CDMs:**  
KLI emphasizes that different knowledge components may need different instructional approaches. A CDM that infers KC mastery can then be paired with KLI to recommend targeted instruction.

**Example (Pi.mn):**
- KC: "Distributive property in quadratic expansion."
- Learning process: Induction (learning from examples).
- Instructional method: Worked examples (teacher-modeled on board) + practice (student testing).
- CDM output: "Student has not mastered KC" → pair with worked examples at basic level.

**Pi.mn Fit:** **GOOD** for high-level curriculum design. Teachers already do something like KLI (lecture theory → worked examples → test). Explicit KC taxonomy + learning-process labels would help the system recommend adaptive instruction.

---

## VIII. State-of-the-Art: Neural & Graph-Based Models

### 8.1 NeuralCDM & Variants

**What It Does:**  
Projects students and exercises to latent vectors; uses neural network to model the interaction. Unlike DINA (interpretable but rigid), NeuralCDM is flexible.

**How It Works:**  
- Student embedding: s ∈ ℝ^d (d = 50–200).
- Exercise embedding: e ∈ ℝ^d.
- Prediction: P(correct) = sigmoid(neural_net(s, e)).

**Data Requirements:**
- **100–1000 observations per student** to learn embeddings reliably.
- Deep architectures are prone to overfitting on sparse data.

**Advantages:**
- Flexible; can model compensatory and complex skill interactions.
- State-of-the-art accuracy on dense datasets (100K+ students, 10+ attempts each).

**Limitations:**
- Black-box; no interpretable output (which skills are missing?).
- High variance on sparse data (≤ 50 observations per student).
- Requires careful regularization and tuning.

**Pi.mn Fit:** **POOR** for direct application. Pi.mn has only ~17 attempts per student on average. NeuralCDM would overfit badly. However, a *fine-tuned* NeuralCDM (pre-trained on a large external dataset, then adapted to Pi.mn) might work. Not recommended as primary approach.

---

### 8.2 Graph-Based CDMs (RCD, SCD)

**What It Does:**  
Treats students, exercises, and concepts as a graph. Uses graph neural networks (GNNs) to propagate information.

- Node: student, exercise, or concept.
- Edge: student attempted exercise; exercise targets concept.
- GNN layer: each node aggregates info from neighbors.

**Data Requirements:**
- ~10–20 observations per student (better than NeuralCDM).
- Requires a concept-to-exercise mapping (prerequisite structure).

**Advantages:**
- Handles sparse data better than vanilla NeuralCDM.
- Can leverage prerequisite structure (Pi.mn teachers can provide).
- Interpretable graph structure.

**Limitations:**
- Still requires careful hyperparameter tuning.
- Over-smoothing if graph is too dense or uniform.

**Pi.mn Fit:** **MODERATE GOOD** as secondary approach. If Pi.mn builds a concept graph (which concepts are prerequisites for which), a GNN-CDM could be trained on Pi.mn data directly. Requires engineering; not plug-and-play.

---

## IX. Cautions for Pi.mn

### 9.1 Sparse Data & Overfitting Risk

- **Problem:** Pi.mn has 0.3% density (359 students, ~17 attempts each, ~6000 problems). Standard CDMs assume ≥ 3–5% density.
- **Risk:** Any model with >20 parameters per student will overfit.
- **Mitigation:** Strongly regularize; use knowledge priors (graphs, transfer learning); validate on held-out students, not just held-out problems.

### 9.2 Evening Self-Report Bias

- **Problem:** SOLVED_CLEAN vs. FIXED_AFTER_ERROR vs. FAILED vs. GUESSED are self-assessed, after-the-fact, and potentially biased by memory or social desirability.
- **Risk:** A student who marks "FIXED_AFTER_ERROR" may still not understand the topic; a student who marks "FAILED" may have just been careless.
- **Mitigation:** Treat self-reported states as weak signals, not ground truth. Validate with classroom tests (OMR, which are marked by teachers in real-time).

### 9.3 Teacher Label Quality Variation

- **Problem:** MistakeType is hand-labelled by teachers (13 people). Label consistency is unknown.
- **Risk:** Inter-rater reliability (Cohen's κ) could be low, especially on borderline cases (is this CONCEPT_GAP or INCOMPLETE_STEP?).
- **Mitigation:** Before building a large system, run a reliability study: sample ~100 problems labelled by all 13 teachers; measure κ for each mistake type; address low-agreement types.

### 9.4 Mongolian Mathematic Curriculum Specificity

- **Problem:** Published CDM datasets (Eedi, Khan Academy, TIMSS) are English-language K–12 or US college. Mongolian ЭЕШ has different topics, pacing, and terminology.
- **Risk:** Transfer learning approaches trained on English datasets may not capture Mongolian-specific misconceptions.
- **Mitigation:** Validate any imported model on a subset of Pi.mn data. If accuracy is low (<70%), retrain from scratch on Pi.mn data (if feasible) or augment training data with Mongolian examples.

### 9.5 Trade-off Between Interpretability & Accuracy

- **Problem:** Interpretable models (DINA, CBM) are simpler but less accurate on complex data. Neural models are more accurate but black-box.
- **Risk:** If Pi.mn uses a black-box model and a student's parent asks "Why does the system think my child doesn't know exponents?", there's no crisp answer.
- **Mitigation:** Prioritize interpretable models (DINA, CBM, constraint-based) initially. Use neural models only for:
  - Offline analysis / research (not real-time feedback).
  - As an ensemble with interpretable models (predict with NN, explain with DINA).

### 9.6 Lack of Real-Time Interaction & Hints

- **Problem:** Current data (evening self-reports + OMR marks) do not capture student hesitations, re-reads, hints requested, or time-on-task. Real ITS systems use these signals heavily.
- **Risk:** Diagnosis is less fine-grained than what Pi.mn teachers know from in-classroom observation.
- **Mitigation:** If Pi.mn moves to online testing (vs. classroom OMR), capture:
  - Time per step.
  - Hints requested (and which ones helped).
  - Whether student changed answer.

---

## X. Recommended Roadmap for Pi.mn

### Phase 1: Baseline (Weeks 1–4)

1. **Codify prerequisite structure:** Have mathematics teachers draw a directed acyclic graph (DAG) of ~50–100 concepts and prerequisites.
   - Effort: 1–2 teacher-weeks.
   - Output: concept graph, usable for knowledge priors.

2. **Collect teacher consensus on Q-matrix (sample):** Pick one challenging chapter (20–30 problems); have 2–3 teachers independently assign attributes (skills required) per problem; measure inter-rater agreement.
   - Effort: 1 teacher-week.
   - Output: validated Q-matrix for one chapter; insight into labeling consistency.

3. **Pilot DINA on sample:** Fit DINA model on sample chapter data; compare skill estimates to classroom observations.
   - Effort: 1 developer-week.
   - Output: baseline accuracy, insight into model fit.

### Phase 2: Error Taxonomy & CBM (Weeks 5–12)

4. **Systematize mistake types:** From existing teacher-labelled errors, refine the 6 MistakeTypes into ~15–20 more granular categories (e.g., "sign error in distribution" vs. "sign error in exponent").
   - Effort: 2 teacher-weeks + 1 developer-week.
   - Output: refined taxonomy; annotated corpus of 1000–2000 errors.

5. **Author domain constraints (algebra focus):** Design 50–100 constraints for algebra (exponents, distribution, fractions, linear equations). For each constraint, write a diagnostic rule ("if student's answer violates constraint X, infer skill gap Y").
   - Effort: 3–4 developer-weeks (with teacher consultation).
   - Output: constraint engine; can diagnose ~80% of algebra errors.

6. **Validate CBM on classroom tests:** In one class, administer a test; use CBM to infer skill gaps; compare to teacher observation. Refine constraints based on mismatches.
   - Effort: 1 teacher + 1 developer, ongoing.

### Phase 3: Integrated System (Weeks 13–24)

7. **Integrate DINA + constraints + knowledge graph:**
   - DINA: coarse skill estimate from sparse data.
   - Constraints: fine-grained error diagnosis for algebra.
   - Graph: boost DINA estimates using prerequisite structure.

8. **Pilot with one class:** Use system to generate personalized problem recommendations; measure engagement, learning gain, student satisfaction.

9. **Deploy diagnostic feedback:** When student marks an answer wrong, system displays:
   - (1) Which skill(s) are likely missing (DINA estimate).
   - (2) Which specific rule was violated, if identifiable (CBM).
   - (3) Recommended next problem (targeting gap).
   - (4) Link to reteach (video, worked example, hint).

### Phase 4: Refinement & Scaling (Months 6–12)

10. **Collect online step-level data (if applicable):** If Pi.mn builds an online homework platform (vs. classroom-only OMR), capture step-level work and time. Use this to improve diagnosis precision.

11. **Expand constraint library:** Periodically add new constraints as new error patterns are observed.

12. **Measure impact:** Track student learning gains (pre-test vs. ЭЕШ score) for cohorts using diagnostic feedback vs. standard feedback. A/B test if feasible.

---

## XI. Literature & Sources Examined

| # | Title | Authors | Year | Venue | Type | Key Finding | Effect Size |
|----|-------|---------|------|-------|------|-------------|------------|
| 1 | Bayesian Estimation of the DINA Q-matrix | Junker & Sijtsma | 2001 | Psychometrika | Peer-reviewed | Q-matrix misspecification biases skill estimates | |
| 2 | The Generalized DINA Model Framework | de la Torre | 2011 | Psychometrika | Peer-reviewed | G-DINA subsumes DINA, DINO, and others; more flexible | |
| 3 | A Survey of Models for Cognitive Diagnosis | Zeng et al. | 2024 | Preprint (arXiv) | Survey | Comprehensive overview of CDMs; data requirements vary from 5–1000 obs/student | |
| 4 | NeuralCD: A General Framework for Cognitive Diagnosis | Wang et al. | 2022 | IEEE TKDE | Peer-reviewed | NeuralCDM outperforms DINA on dense data; needs 100+ obs/student | RMSE: 0.15 (NN) vs 0.22 (DINA) on dense |
| 5 | TLCD: Cross-Disciplinary Cognitive Diagnosis | Zeng et al. | 2025 | Preprint | Deep transfer learning CDM | Transfer learning improves accuracy on target domain by 4–8% | +4–8% acc |
| 6 | Instructions & Guide: NeurIPS 2020 Education Challenge | Eedi et al. | 2020 | NeurIPS workshop | Challenge paper | Dataset: 1,857 questions, 20M responses, sparse (11% density) | |
| 7 | Constraint-Based Modeling: Representing Student Knowledge | Ohlsson | 1994 | Foundational paper | Theory | CBM explains learning from errors via rule-specialization; practical for ITS | |
| 8 | Fifteen Years of Constraint-Based Tutors | Mitrovic | 2012 | User Model. & User-Adapted Inter. | Survey | CBM deployed in SQL-Tutor, KERMIT (database, geometry); students learn 2× faster with augmented feedback | |
| 9 | Algebra Mal-Rules | Payne & Squibb | 1990 | Cognitive Science | Peer-reviewed | Coherent misconceptions (buggy rules) explain 39% of systematic errors in algebra | 39% systematic error rate |
| 10 | Diagnostic Models for Procedural Bugs | Brown & Burton | 1978 | Cognitive Science | Classic paper | BUGGY system catalogued 100+ arithmetic bugs; foundational to error diagnosis | |
| 11 | MalruleLib: Large-Scale Misconception Reasoning | Chen et al. | 2026 | Preprint | Resource | 1000+ executable algebra mal-rules with step traces; enables automatic error detection | |
| 12 | Student Cognitive Agents using MalAlgoPy | (Anonymous) | 2024 | Preprint | Framework | Graph-based generator of linear-equation solutions; 22 documented misconceptions | |
| 13 | Sources of Student Errors in Algebra | Various | 2015 | ERIC | Educational research | 56+ documented algebra misconceptions (illegal canceling, wrong distribution, etc.) | |
| 14 | Cognitive-Uncertainty Guided Knowledge Distillation | Liu et al. | 2025 | Preprint | Method | Uses uncertainty to classify misconceptions; 5–8% improvement on MC distractors | +5–8% |
| 15 | Algebra Error Classification with LLMs | Holstein et al. | 2023 | AIED | Peer-reviewed | LLM-based error classification outperforms rule-based; generalizes better | +12% accuracy vs rule-based |
| 16 | The Knowledge-Learning-Instruction Framework | Koedinger et al. | 2012 | Cognitive Science | Peer-reviewed | KLI framework aligns KC, learning processes, instruction; applied in multiple courses | |
| 17 | Finding and Fixing Errors in Worked Examples | Grosse & Renkl | 2008 | Learning and Instruction | Peer-reviewed | Error-detection in examples effective for learning; effect depends on prior knowledge | +0.4–0.7 SD for high-KC learners |
| 18 | Analysis of Distractors in Math MC Questions | Cui et al. | 2024 | Learning Sci. Res. | Peer-reviewed | Well-designed distractors reveal misconceptions; LLMs lag at capturing real student errors | |
| 19 | Beyond Knowledge Tracing: Skill Topologies | Käser et al. | 2014 | KDD | Peer-reviewed | Bayesian networks over skills (vs independent BKT) improve estimation with sparse data | +2–4% accuracy |
| 20 | Breaking Sparsity Barrier in Cognitive Diagnosis | Gao et al. | 2024 | Preprint | Method (ESR-CD) | Sparsity-aware masking module improves CD accuracy by 6% on sparse data | +6% |
| 21 | Self-Supervised Graph Learning for Long-Tailed CD | Liu et al. | 2022 | Preprint | Method (SCD) | Self-supervised learning helps on data-scarce scenarios; 3–5% improvement | +3–5% |
| 22 | MetaCD: Meta Learning for Cognitive Diagnosis | Zeng et al. | 2025 | Preprint | Method | Meta-learning framework; adapts rapidly to new students with few shots | Early-stage; not validated at scale |
| 23 | Data-Mining Textual Responses to Uncover Misconception Patterns | Narasimhan et al. | 2017 | EDM | Peer-reviewed | NLP on open-response data can cluster misconceptions; unreliable without structured data | |
| 24 | Item Selection in CD-CAT | Lin et al. | 2018–2023 | J. Educational Measurement & J. Educ. Data Mining | Multiple papers | Adaptive item selection (DKL, GDI indices) improve test efficiency; 15–25% fewer items needed | 15–25% test reduction |
| 25 | Item Response Theory for Misconception Detection | Thygeson et al. | 2021 | Frontiers in Psychology | Peer-reviewed | IRT + nominal categories model can infer misconceptions from MC distractors | |

---

## XII. Search Gaps & Limitations

1. **Mongolian Mathematics Curricula:** No published studies on CDM applied to Mongolian ЭЕШ prep. All cited Eedi, Khan, TIMSS data are English/international. Risk: misconceptions may differ.

2. **Evening Self-Report Validation:** No published validation of self-assessed learning states (SOLVED_CLEAN vs. GUESSED) against classroom teacher marks. Risk: self-reports may be unreliable.

3. **Teacher Label Consistency:** No inter-rater reliability data for the 6 MistakeTypes used by Pi.mn. Risk: labels may vary across teachers.

4. **Step-Level Data Capture:** Most cited studies assume rich log data (time, hints, step traces). Pi.mn currently has only final answers + evening self-reports. Diagnosis on sparse logs is an open problem.

5. **Online vs. Classroom Learning:** Eedi, Khan, NeurIPS data are from online platforms. Pi.mn is classroom + evening self-report. Transfer-learning assumptions may not hold.

6. **Teacher Feedback Loop:** No RCTs validating that diagnostic feedback (from CDM) improves learning outcomes vs. standard teacher feedback in a tutoring-center context. All ITSs studies are lab or large-scale online; no small-center (<400 students) RCTs found.

---

## XIII. Recommended Further Reading

**Foundational CDM:**
- de la Torre (2011): GDINA framework. Accessible overview.
- Junker & Sijtsma (2001): DINA & Q-matrix. Mathematical rigor.

**Step-Level Diagnosis:**
- Ohlsson (1994), Mitrovic (2012): Constraint-based modeling. Practical and proven.
- Payne & Squibb (1990), Brown & Burton (1978): Buggy rules. Cornerstone; very readable.

**Sparse Data & Transfer:**
- Zeng et al. (2024): Survey of CDMs with data-hunger estimates.
- Zeng et al. (2025): Transfer learning (TLCD). Bleeding-edge but practical.

**Misconceptions:**
- Eedi challenge papers (2020): Distractor-based diagnosis at scale.
- Chen et al. (2026): MalruleLib. Algebra-focused; executable.

**Practical ITS Design:**
- Koedinger et al. (2012): KLI framework. Bridges theory and practice.

---

## XIV. Conclusion

For Pi.mn's immediate needs (identifying step-level error patterns, distinguishing careless from conceptual errors, sparse ~17 observations per student), the most promising approaches are:

1. **DINA/GDINA + knowledge graph priors** (interpretable, 5–10% density feasible, 3–6% boost from priors).
2. **Constraint-based modeling** (domain-specific, step-level diagnosis, directly interpretable, proven in classrooms).
3. **Buggy-rules libraries** (systematizes teacher expertise, reusable, extends to new errors incrementally).
4. **Error taxonomies** (low-tech, actionable, bridges data and pedagogy).

Neural and deep models (NeuralCDM, GNNs) are **not ready** for Pi.mn as primary systems but can be piloted as ensemble members once step-level online data is available.

**Immediate next step:** Codify prerequisite structure (DAG) + validate Q-matrix on sample chapter. Effort: 2–3 teacher-weeks + 1 developer-week. Expected outcome: feasible baseline for Phase 2 expansion.

