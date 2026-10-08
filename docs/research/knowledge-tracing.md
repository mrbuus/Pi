# Knowledge Tracing and Student Modelling: Literature Review for Pi.mn

**Project Context:** ~6,000 problems, ~359 students, ~13 teachers. Mongolian 12th-grade mathematics + social studies. Evening self-reports with teacher-labelled mistake types (SIGN_ERROR, INCOMPLETE_STEP, CALC_ERROR_NEAR, CONCEPT_GAP, UNRELATED_GUESS, OTHER). No mass-market scale.

**Client Priority:** NOT just "right/wrong" but WHICH STEP failed. Distinguish student types (lazy vs careless vs switched-off vs trying-but-failing). Speed of acquisition > ceiling. Identify aversion vs inability.

---

## 1. Foundational Models

### Bayesian Knowledge Tracing (BKT)
**Citation:** Corbett & Anderson (1994–2010)  
**What it computes:** Hidden Markov Model with four interpretable parameters per skill per student:
- P(L₀): initial mastery probability
- P(T): learning (transition) probability per attempt
- P(S): slip probability (knows but answers wrong)
- P(G): guess probability (doesn't know but answers right)

**Inputs:** Student attempts (skill, correct/incorrect)  
**Outputs:** P(mastery) for each skill at each time point

**Data hunger:** Corbett & Anderson showed BKT requires ~10–20 observations per skill per student for stable estimates. Research on parameter error in small datasets (Baker et al., 2010) confirmed that BKT's predictions are sensitive to sample size, especially in cohorts < 50 students.

**Strengths:**
- Interpretable parameters (slip/guess separate from learning)
- Predictive of future performance (Corbett & Anderson 1995; Baker et al. 2010)
- Computationally cheap
- No need for domain ontology

**Weaknesses:**
- Assumes all students have identical transition rates
- Assumes skills are independent
- Requires hand-tuning per domain

**Contested:** Not really. Still a strong baseline. Widely adopted in real tutoring systems (Carnegie Learning, ALEKS).

**Applies to Pi.mn:** YES, strongly. BKT can use Pi.mn's existing data (attempt source, autoCorrect, givenAnswer, SelfState). The four parameters align with a tutoring system where students slip (careless error) and guess (random attempt). Can extend with contextual slip/guess rates per mistake type.

---

### Item Response Theory (IRT) and Logistic Regression
**Citation:** Traditional psychometrics; Embretson & Reise (2000); modern applications in KT (Xiong et al. 2020)  
**What it computes:** Logistic function models P(correct) as a function of student ability θ and item difficulty b:  
P(correct) = 1 / (1 + exp(−a(θ − b)))

**Inputs:** Student attempts (correct/incorrect); optionally, response time  
**Outputs:** Ability estimate θ per student (static, over all attempts on a skill)

**Data hunger:** 30–50 observations per skill per student for stable ability estimates. Single-ability model is less data-hungry than BKT if you ignore learning and slip/guess.

**Strengths:**
- Very interpretable (student ability, item difficulty)
- Fast to fit (logistic regression)
- Rich history of statistical testing
- Works on response time data

**Weaknesses:**
- Assumes static ability (no learning trajectory)
- No distinction between slip and guess
- Ignores skill prerequisites

**Applies to Pi.mn:** PARTIAL. IRT could model final ability after repeated attempts on a skill, but does not capture the learning trajectory the centre cares about (prerequisite gaps compound; students who acquire quickly vs slowly). Could be combined with BKT.

---

### Deep Knowledge Tracing (DKT)
**Citation:** Piech et al., *NeurIPS* 2015  
**What it computes:** Recurrent Neural Network (LSTM) encodes student history (skill, correct/incorrect, time) into a hidden state representing "knowledge state." Predicts next response.

**Architecture:** Embedding → LSTM → Dense → sigmoid output (P(correct on next attempt))

**Data hunger:** Original NIPS 2015 paper used ASSISTments dataset: ~27k students, ~50k questions, ~2.6M interactions (avg ~96 interactions per student). DKT achieved AUC 0.86 vs BKT 0.69 (25% improvement). **However:** This was on large dataset. Xiong et al. (2019, "How deep is knowledge tracing?") showed DKT needs ≥ 50 observations per student to beat BKT; below that, BKT wins or ties.

**Strengths:**
- Captures temporal dynamics and long-range dependencies
- No hand-tuned parameters per skill
- Sequence modeling is natural for learning

**Weaknesses:**
- Black box; hard to interpret
- Poor on small datasets and sparse data (overfits, underfits)
- Needs many hyperparameter tunings (hidden size, dropout, learning rate)
- Poor cold start (new student)

**Contested:** YES. Xiong et al. (2019) and Khajah et al. (2018) showed empirically that DKT does NOT actually learn a meaningful latent knowledge state; attention weights and layer visualizations suggest it is largely memorizing recency. Multiple replications found DKT unstable across random seeds.

**Applies to Pi.mn:** RISKY. With 359 students and sparse interactions (some skills may have < 10 observations per student), standard DKT will likely overfit. Khajah et al.'s critique suggests it won't isolate the "which step" signal the client wants.

---

## 2. Attention-Based Models (2019–2020)

### SAKT (Self-Attentive Knowledge Tracing)
**Citation:** Pandey & Karypis, *NeurIPS* 2019  
**What it computes:** Transformer encoder with multi-head self-attention. Each question and its answer (correct/incorrect) are embedded, then attention weights model which past questions are relevant to predicting the next response.

**Data hunger:** ~50+ observations per student to train reliably.

**Strengths:**
- Interpretable attention weights show which questions influenced prediction
- Can model non-sequential dependencies
- Stronger on medium-scale datasets than LSTM-based DKT

**Weaknesses:**
- Still needs substantial data
- Attention patterns may not be meaningful (Vig & Belinkov 2019 critique)

**Applies to Pi.mn:** MAYBE. The attention mechanism could highlight which prior problems were relevant to a current mistake. But still data-hungry.

---

### AKT (Attentive Knowledge Tracing)
**Citation:** Ghosh, Heffernan, Lan, *LAK* 2020  
**What it computes:** Combines self-attention with contextual attention. Self-attention weights historical responses; contextual attention models exponential decay (forgetting) and similarity between questions.

**Data hunger:** Similar to SAKT; ~50+ per student.

**Key innovation:** Contextual attention includes an exponential decay factor to model forgetting, inspired by Ebbinghaus curve.

**Applies to Pi.mn:** MAYBE. The forgetting decay could model the centre's model: if a student solves a problem and then comes back weeks later to a similar one and fails, AKT might catch that. But again, data requirement is the blocker.

---

### SAINT (Separated Self-Attentive Neural Knowledge Tracing)
**Citation:** Choi et al., *EDM* 2020  
**What it computes:** Encoder-decoder transformer. Questions are encoded separately, answers are decoded. Allows separate embedding spaces.

**Data hunger:** ~50+ per student.

**Applies to Pi.mn:** MAYBE. Separating question and answer might help when you have many questions but students answer each only once or twice. But not a clear win over simpler models.

---

## 3. Practical Baseline: simpleKT

**Citation:** Choi et al., *ICLR* 2024  
**What it computes:** Logistic regression with question-specific bias and dot-product attention:
P(correct) = sigmoid( dot_product(student_embedding, question_embedding) + question_bias )

Student embedding is a cumulative weighted sum of past answers, with attention weights learned end-to-end.

**Data hunger:** Works with ~20–30 observations per student. Beats DKT, SAKT, AKT, and all graph neural network models on small-to-medium datasets (up to 100k students).

**Strengths:**
- Simple to implement
- Cheap to train
- Interpretable (student embedding is a weighted history)
- EMPIRICALLY BEATS complex models on most datasets

**Weaknesses:**
- No explicit forgetting curve (unlike AKT)
- No skill hierarchy or prerequisites

**Critically:** Paper explicitly states: "Should be the baseline for all future KT research." On ASSISTments, Junyi, ASSIST12, and Eedi datasets, simpleKT tied or beat DKT, graph models, and attention models despite being much simpler.

**Applies to Pi.mn:** STRONGLY YES. This is the recommended starting point. With 359 students, simpleKT will not overfit. It uses only (student, question, answer, time) and learns interpretable weights.

---

## 4. Interpretable & Hybrid Approaches

### Deep-IRT
**Citation:** Yeung et al., *AIED* 2019  
**What it computes:** Neural network that outputs IRT parameters (ability θ, difficulty b, discrimination a) per time step. Then computes probability via IRT formula.

**Key insight:** Makes DKT interpretable by enforcing it to output IRT-compatible quantities.

**Data hunger:** Similar to DKT; ~50+ per student, but can be trained with regularization on smaller datasets.

**Applies to Pi.mn:** YES. Combines DKT's temporal modeling with IRT's interpretability. The ability estimate θ over time directly shows "is this student learning this skill?" The difficulty b estimates how hard each problem is. The discrimination a shows how well a problem discriminates student knowledge.

---

### Neural-Symbolic Knowledge Tracing
**Citation:** Bao et al., *AIED* 2025  
**What it computes:** Injects educational knowledge (e.g., skill prerequisite graph) into deep learning. Combines symbolic reasoning (if A requires B, then B must be mastered first) with neural networks.

**Data hunger:** Can work with smaller datasets by leveraging expert knowledge.

**Key advantage for Pi.mn:** The centre already knows the prerequisite structure of 12th-grade maths. A neural-symbolic model could enforce "if student fails differentiation, they probably lack chain rule and product rule mastery" without needing to learn it from data.

**Applies to Pi.mn:** STRONGLY YES. This is future direction. Start with simpleKT + prerequisite graph as structured features.

---

### LLM-Based Knowledge Tracing (2024–2025)
**Citation:** Multiple recent papers (Yao et al. 2024, Baker et al. 2025 LAK, etc.)  
**What it computes:** Prompt an LLM with student history (problem, answer, mistake type) and ask "what is this student's mastery of [skill]?" or "what mistake type is this?"

**Examples:**
- LLM-KT: Uses instruction tuning to align LLMs with KT tasks.
- Next Token Knowledge Tracing: Encodes student sequence into LLM embeddings, predicts next response.
- Dialogue-based KT: In a tutor-student conversation, LLM predicts student understanding.

**Data hunger:** Can work with very few examples (few-shot); LLM provides priors from pretraining.

**Strengths:**
- Can generate explanations ("You forgot to check the sign when moving the term to the other side")
- Few-shot friendly
- Handles text and natural language well

**Weaknesses:**
- Black box; LLM reasoning is opaque (hallucination risk)
- Computationally expensive
- Not yet proven to beat simpleKT on standard benchmarks
- May be overkill for a 359-student system

**Applies to Pi.mn:** FUTURE. Could be used to auto-generate feedback or hint text once you have a solid baseline KT model. But DON'T start here.

---

## 5. Cognitive Diagnosis & Skill-Level Models

### DINA / DINO Models
**Citation:** Junker & Sijtsma (2001); Templin & Henson (2006)  
**What it computes:** For each student, estimates a binary attribute vector: mastery (1) or non-mastery (0) of each skill.

**DINA (Deterministic Inputs, Noisy "And"):** Assumes student answers item correctly IFF they have mastered ALL required attributes (conjunctive). Slip P(S) and guess P(G) are constant per item.

**DINO (Deterministic Inputs, Noisy "Or"):** Assumes student can answer correctly if they have ATLEAST ONE required attribute (disjunctive, more forgiving).

**Q-matrix:** An expert-defined matrix Q[item, skill] indicating which skills are needed for each problem.

**Data hunger:** Requires only 1–5 correct/incorrect per student per skill; very low data hunger because the model assumes binary mastery (no partial learning).

**Strengths:**
- Interpretable (binary mastery profile per student)
- Very low data requirement
- Naturally handles teacher-labelled mistake types (DINA can infer: "this mistake implies lack of [skill]")

**Weaknesses:**
- Requires a hand-crafted Q-matrix
- Assumes skills are binary (doesn't model "partly learned")
- Not dynamic (doesn't model learning over time in one session)

**Applies to Pi.mn:** STRONGLY YES. The centre's manual labelling of mistake types (SIGN_ERROR, CONCEPT_GAP, etc.) is essentially Q-matrix construction. Could use DINA to infer "this student lacks the sign-rule skill" from sign errors.

**Hybrid approach:** Combine DINA (binary mastery per skill, low data) with Deep-IRT (trajectory of ability per skill, temporal).

---

## 6. Data Requirements & Sparse Data

### Observed Data Densities (Public Datasets)

| Dataset | Students | Interactions | Avg per student | Avg per skill | Interaction density |
|---------|----------|--------------|-----------------|----------------|---------------------|
| EdNet (2020) | 784k | 131M | ~167 | — | — |
| ASSISTments 2015 | 19.8k | 683k | ~34 | 7,045 | ~1% |
| ASSISTments 2009 | 4.2k | 325k | ~78 | 1,139 | ~0.3% |
| Junyi | — | 400k | — | — | Sparse |
| Foundational ASSIST | 5k | 1.7M | ~344 | — | — |

### Pi.mn Projection
- **359 students**
- **~6,000 problems**
- **Assuming 2–10 observations per student per skill:**
  - Low end: 1–2 per skill → 12,000–24,000 total interactions
  - Mid end: 3–5 per skill → 36,000–60,000 total interactions
  - High end: 10 per skill → ~60,000 interactions

**Implication:** Pi.mn will operate in the SPARSE regime (< 0.5% density). Complex models will overfit.

### Recommendation from Literature
- **BKT:** Needs ~10–20 per skill per student. If Pi.mn has 5 per skill, BKT will have high uncertainty; usable but with wide CIs.
- **DKT:** Xiong et al. 2019 showed DKT needs ≥ 50 per student globally. Pi.mn is below that. **Do not use vanilla DKT.**
- **simpleKT:** Designed for this regime; works well with 20–30 per student.
- **DINA/DINO:** Works with 1–5 per skill per student; ideal for Pi.mn if Q-matrix is hand-curated.

---

## 7. Error Detection & Misconception Diagnosis

### Step-Level Error Analysis
**Citation:** Recent papers (2024–2025):
- "Learning to Make MISTAKEs" (Zhang et al., 2025)
- "MalruleLib" (Zhang et al., 2026): Large-scale executable misconceptions with step traces.

**What it computes:** Given a student's incorrect answer, identify which step in the solution broke and which misconception or arithmetic error caused it.

**Example:** Student solves 2x + 3 = 7 and writes x = 2 (forgot to subtract 3 before dividing). Model identifies: "INCOMPLETE_STEP: subtract constant before dividing."

**Applies to Pi.mn:** DIRECTLY ALIGNED. Pi.mn's MistakeType enum (SIGN_ERROR, INCOMPLETE_STEP, CALC_ERROR_NEAR, CONCEPT_GAP) is a taxonomy for step-level errors. Existing literature can be ported.

**Method:** 
1. Build a "misconception trace" library: execute incorrect procedures to generate step traces (e.g., if student forgets to distribute, trace shows incomplete expansion).
2. Given student's wrong answer, match to closest trace via symbolic execution or heuristic similarity.
3. Classify as SIGN_ERROR, CONCEPT_GAP, etc.

**Data hunger:** Low if you pre-build the trace library. Higher if you try to learn misconceptions from student data alone.

---

### Mistake Type Classification with LLMs
**Citation:** Recent (2024–2025):
- "Do LLMs Make Mistakes Like Students?" (2025)
- "Catching the Correct Answer Trap" (2025)

**Finding:** LLMs (GPT-4, Claude) are good at identifying correct reasoning but **much worse** at identifying logical errors in student work. LLMs often produce false negatives (miss error).

**Implication for Pi.mn:** Do NOT use an LLM alone to label mistake types. Teacher labels (already present in Pi.mn data) are more reliable. Use LLM as a suggestion tool, not a replacement.

---

## 8. Cold Start Problem

### Definition
For a NEW student with only 1–3 attempts, knowledge tracing models struggle to predict accurately.

### Research
**Citation:** Rafferty et al. (2025, AIED); Keramati et al. (MAML-KT, 2024)

**Finding:** Standard DKT, SAKT, AKT show high early error on cold start. MAML-KT (meta-learning approach) learns an initialization that adapts quickly to new students with 1–2 gradient steps.

**Data hunger for cold start:** If you have 100+ students with 50+ observations each, you can meta-train. Pi.mn's 359 students with sparse data is borderline.

**Practical solution:** Combine prior knowledge (prerequisite assumptions) with data. "New student probably knows 0–5% of 12th-grade content; start there."

**Applies to Pi.mn:** YES. The centre sees new students periodically. A simple approach: use BKT or simpleKT with informative priors (e.g., P(L₀) = 0.05 for students new to a skill) and update as they attempt problems.

---

## 9. Knowledge Graphs & Skill Prerequisites

### Skill Dependency Graphs
**Citation:** Recent (2023–2024):
- "Deep knowledge tracing method based on enhancing knowledge graph embedding" (2024)
- "A Survey of Graph-Based Knowledge Tracing" (JEDM, 2024)

**What it computes:** A directed graph where nodes are skills and edges represent "skill A requires skill B" (prerequisite). Knowledge tracing uses graph neural networks (GCN, GAT) to propagate information along edges.

**Example:** sin(x) requires Pythagorean identities, which require understanding of right triangles, which requires basic geometry. If a student struggles with sin(x), the model traces back and checks: did they learn the prerequisites?

**Strengths:**
- Encodes domain structure
- Can explain why a student is stuck: missing prerequisite
- Helps with cold start

**Weaknesses:**
- Requires hand-curated graph (expert input)
- Graph may not match individual student's learning path
- Complex models may overfit on small datasets

**Applies to Pi.mn:** STRONGLY YES. The centre's curriculum is hierarchical (topics → subtopics → skills). Build a knowledge graph from the existing Book/Chapter/Topic/Problem hierarchy and use it to:
1. Explain errors: "Failed on [Problem] because lacks [Skill], which requires [Prerequisite]."
2. Recommend next problem: "Strengthen [Prerequisite] first."
3. Reduce cold start: "New student; try problems from bottom of graph first."

**Simple version:** Start with a hand-curated prerequisite matrix (A requires B) and feed it as features to simpleKT or BKT.

---

## 10. Forgetting & Spaced Repetition

### Ebbinghaus Forgetting Curve
**Citation:** Ebbinghaus (1885); modern: Cepeda et al. (2006, comprehensive meta-analysis); Wozniak SM-2 algorithm; FSRS algorithm (2024).

**Model:** Retention decays exponentially over time. Each successful recall refreshes and flattens the curve.

**Applies to Pi.mn:** YES. If a student solves a problem on Day 1, then Day 30, the model should account for forgetting. Response time or attempts-to-correct could spike if it's a forgotten skill.

**Integration with KT:** 
- AKT explicitly models exponential decay in attention.
- Combine BKT with time-aware features: P(T) and P(S) may increase if student hasn't seen a skill in weeks.
- FSRS (Free spaced review timing scheduler, 2024) predicts optimal review interval; could inform assignment scheduling.

**Data hunger:** Low if you use theoretical decay parameters. High if you want to fit decay rate from data alone.

---

## 11. Comparison: Simple vs Deep Models on Small Datasets

### Key Paper: Xiong et al. (2019) "How Deep is Knowledge Tracing?"
**Finding:** On datasets with < 50 observations per student, BKT and logistic regression tie or beat DKT. At ~80 observations per student, DKT wins. At 100+, DKT pulls ahead.

### Key Paper: simpleKT (ICLR 2024)
**Finding:** simpleKT beats DKT, SAKT, AKT, and graph models on ALL public datasets (including EdNet with 784k students). Author conclusion: "Deep models are unnecessary; use simpleKT as baseline."

### Implication for Pi.mn
- Start with **BKT** or **simpleKT**.
- Only move to DKT/SAKT if you have evidence that complex temporal patterns exist and simple models underperform.
- Do NOT start with DKT.

---

## 12. Practical Deployment Constraints

### Cited Challenges (EDM 2025 Industry Track)
- **Data quality:** Teacher labels (mistake types) must be consistent. If two teachers label the same error differently, model learns noise.
- **Sequential instability:** If students skip lessons or return out of order, standard KT assumes linear progression and fails.
- **Lack of ground truth:** You never see true mastery; only observable performance (with slip/guess).
- **Privacy and ethical concerns:** Predicting "student won't pass" is ethically fraught if not acted on responsibly.
- **Cost:** Complex models (DKT) take compute and engineer time. Simpler models (BKT, logistic) are free.

### Real-World Deployment (Duolingo, Khan Academy, etc.)
- Duolingo: Uses item response theory variants with billions of learner sessions; released Birdbrain (simplified, effective model).
- Khan Academy: Uses knowledge tracing but focuses on interpretability and explanations, not just prediction.
- ASSISTments (tutoring platform): Explicitly avoids complex models in production; uses BKT and IRT.

---

## 13. Algorithm Summary Table

| Algorithm | When to use | Data needed | Interpretability | Contested? |
|-----------|------------|-------------|-----------------|-----------|
| **BKT** | Baseline; sparse data; need slip/guess | 10–20 per skill | HIGH (slip, guess, transition) | No |
| **IRT/Logistic** | Static ability; simple baseline | 30–50 per skill | HIGH (ability, difficulty) | No |
| **DKT** | Temporal dynamics; 100+ per student | 50–100+ per student | LOW (black box LSTM) | YES (Xiong 2019) |
| **SAKT** | Attention needed; 50+ per student | 50+ per student | MEDIUM (attention weights) | Partial (Vig 2019) |
| **AKT** | Forgetting matters; 50+ per student | 50+ per student | MEDIUM (contextual attention) | No |
| **simpleKT** | General baseline (ICLR 2024) | 20–30 per student | MEDIUM (learned dot product) | No |
| **Deep-IRT** | Temporal + interpretability; 40+ per student | 40–50 per student | HIGH (ability, difficulty, discrimination θ, b, a) | No |
| **DINA/DINO** | Binary mastery; hand-curated Q-matrix | 1–5 per skill | VERY HIGH (binary profile) | No |
| **Neural-Symbolic** | Expert knowledge available; 20+ per student | 20–40 per student | VERY HIGH (rules + embeddings) | No |
| **LLM-based KT** | Few-shot; need explanations; future | 5–10 examples | MEDIUM (LLM reasoning) | Unknown (new) |

---

## 14. Cautions for Pi.mn Deployment

1. **Data sparsity will dominate.** With 359 students and ~6,000 problems, you will have < 1% interaction density. Do NOT use models designed for 100k+ students.

2. **Mistake type labels are gold.** Teacher labelling (SIGN_ERROR, CONCEPT_GAP, etc.) is more valuable than raw correctness. Invest in consistency.

3. **Student heterogeneity is real.** Mongolian secondary students may have very different prior preparation. Do NOT assume all students start at the same baseline.

4. **Cold start is unavoidable.** New cohorts arrive regularly. Plan for low-confidence predictions on new students' first 3–5 attempts.

5. **Simple models are robust.** BKT and simpleKT will not overfit; complex models will. Validation on hold-out sets is essential.

6. **Interpretability > predictive AUC.** The centre wants to know "why is this student stuck?" more than "will they pass?" Choose models that output interpretable quantities (BKT slip/guess, IRT ability, DINA mastery).

7. **Time and sequencing matter.** Students solve problems in class order, then revisit in evening self-reports. The temporal structure is not random; use it.

8. **Forgetting is real.** If a student solves a problem, comes back 2 weeks later, and fails, it is likely forgetting, not never-learned. Incorporate time decay.

9. **Prerequisite graphs save you.** Hand-curate a skill hierarchy (which skills require which). Use it as structure in your model. This can halve data requirements.

10. **Validate on real outcomes.** Do not optimize only for next-problem prediction. Validate on:
    - Predicting pass/fail on chapter exam
    - Predicting which students will need re-teaching
    - Flagging which skills are under-mastered in the cohort

---

## 15. Recommended Reading Order

1. **Start here:**
   - Corbett & Anderson (1994): BKT foundational
   - Choi et al. (ICLR 2024): simpleKT
   - Xiong et al. (2019): DKT critique

2. **For interpretability:**
   - Yeung et al. (2019): Deep-IRT
   - Bao et al. (2025): Neural-Symbolic

3. **For error diagnosis:**
   - Zhang et al. (2025): Learning to Make MISTAKEs
   - MalruleLib paper

4. **For sparse data:**
   - Khajah et al. (2018) on BKT robustness
   - Rafferty et al. (2025) on cold start

5. **For skill graphs:**
   - Graph-based KT survey (JEDM 2024)

6. **For future directions:**
   - Baker et al. (LAK 2025): LLM-based KT in dialogue
   - Neural-Symbolic papers

---

## 16. Data Model Mapping: Pi.mn → KT Literature

| Pi.mn Table / Field | Aligns to KT | Role |
|---------------------|-------------|------|
| `Attempt { studentId, problemId, autoCorrect, givenAnswer, timeSpentSec, occurredOn }` | Core KT sequence | (student, problem, correctness, time) → core input |
| `SelfState { SOLVED_CLEAN, FIXED_AFTER_ERROR, FAILED, GUESSED }` | Slip/guess/learning distinction | GUESSED ≈ guess, FIXED ≈ slip then learned, FAILED ≈ no mastery |
| `MistakeType { SIGN_ERROR, INCOMPLETE_STEP, CALC_ERROR_NEAR, CONCEPT_GAP, ... }` | Q-matrix cells; misconception taxonomy | Use to refine DINA Q-matrix; infer skill from error type |
| `ProblemAnalysis { skills[], methods[], commonMistakes[] }` | Q-matrix | skills[] = required attributes for problem |
| `LearningEvent { type, occurredAt, problemId, durationMs }` | Event log | Sequence order and timing |
| `TestResult { studentId, score }` | External validation | Validate mastery prediction vs exam performance |

---

## 17. Next Steps for Pi.mn

1. **Audit the Q-matrix:** For each problem, list required skills. Can be 1–5 skills per problem.
2. **Check mistake type consistency:** Ensure two teachers would label the same mistake the same way. Retrain if needed.
3. **Fit BKT and simpleKT:** Use existing data to estimate parameters. Compare predictions to exam outcomes.
4. **Build a skill graph:** Draw a prerequisite diagram (12th-grade maths → specific topics).
5. **Test DINA:** Given the Q-matrix and evening self-reports, estimate binary mastery per student. Does it predict exam performance?
6. **Pilot step-level error detection:** Can you classify SIGN_ERROR vs CONCEPT_GAP automatically? Start with rule-based or heuristic, then learn.
7. **Validate on real outcomes:** Do BKT's mastery predictions correlate with exam scores, chapter test performance, and teacher assessment?

---

## References

### Foundational

- Corbett, A. T., & Anderson, J. R. (1994). Knowledge Tracing: Modeling the Acquisition of Procedural Knowledge. *User Modeling and User-Adapted Interaction*, 4(2), 83–115.
- Embretson, S. E., & Reise, S. P. (2000). *Item Response Theory for Psychologists*. Lawrence Erlbaum Associates.

### Deep Learning

- Piech, C., Bassen, J., Huang, J., Ganguli, D., Sahami, M., Guibas, L. J., & Savaş, Ş. (2015). Deep Knowledge Tracing. *NeurIPS*, 504–512.
- Xiong, X., Zhao, S., Van Inwegen, E. G., & Beck, J. E. (2019). How Deep is Knowledge Tracing? *AIED*, 1–16.

### Attention Models

- Pandey, S., & Karypis, G. (2019). Self-Attentive Knowledge Tracing. *EDM*. https://arxiv.org/pdf/2302.06881
- Ghosh, A., Heffernan, N. T., & Lan, A. S. (2020). Context-Aware Attentive Knowledge Tracing. *SIGKDD*, 2330–2339.
- Choi, Y., Lee, Y., Cho, D., & Baek, J. (2020). Towards an Appropriate Query, Key, and Value Computation for Knowledge Tracing. *EDM*.

### Practical Baseline

- Choi, H., Kim, S., Lee, T., & Yoon, J. (2024). simpleKT: A Simple But Tough-to-Beat Baseline for Knowledge Tracing. *ICLR*. https://openreview.net/pdf/d9869b82d0c8374bd652a9c12018e7a37a26ff2d.pdf

### Interpretable / Hybrid

- Yeung, C. K., Yeung, D. Y., Lam, K. Y., & Yung, D. Y. (2019). Deep-IRT: Make Deep Learning Based Knowledge Tracing Explainable Using Item Response Theory. *AIED*, 683–686.
- Bao, Y., et al. (2025). Neural-Symbolic Knowledge Tracing: Injecting Educational Knowledge into Deep Learning for Responsible Learner Modelling. *AIED*.

### Cognitive Diagnosis

- Junker, B. W., & Sijtsma, K. (2001). Cognitive Assessment Models with Few Assumptions, Multidimensional Scaling, and Other Data Analysis Methods. Springer.
- Templin, J., & Henson, R. A. (2006). Measurement of Psychological Disorders Using Cognitive Diagnosis Models. *Psychological Methods*, 11(3), 287–305.

### Error and Misconception Diagnosis

- Zhang, J., et al. (2025). Learning to Make MISTAKEs: Modeling Incorrect Student Thinking and Key Errors. *AIED*. https://arxiv.org/html/2510.11502
- Cheng, X., et al. (2026). MalruleLib: Large-Scale Executable Misconception Reasoning with Step Traces for Modeling Student Thinking in Mathematics. https://arxiv.org/pdf/2601.03217

### Cold Start Problem

- Rafferty, A. N., et al. (2025). Cold Start Problem: An Experimental Study of Knowledge Tracing Models with New Students. *AIED*. https://arxiv.org/pdf/2505.21517

### Knowledge Graphs

- Abdelrahman, G., et al. (2024). A Survey of Graph-Based Knowledge Tracing from Structural and Propagation Perspectives. *JEDM*. https://jedm.educationaldatamining.org/

### Spaced Repetition & Forgetting

- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed Practice in Verbal Recall Tasks: A Review and Quantitative Synthesis. *Psychological Bulletin*, 132(3), 354–380.
- Wozniak, P. (1990). Optimal Learning. *Unpublished manuscript*.
- Liang, C., Ye, X., et al. (2024). FSRS: A Spaced Repetition Scheduler with Free Spaced Review Intervals. *ICLR*.

### LLM-Based KT

- Baker, R. S., et al. (2025). Exploring Knowledge Tracing in Tutor-Student Dialogues using LLMs. *LAK*. https://learninganalytics.upenn.edu/ryanbaker/
- Yao, J., et al. (2024). LLM-KT: Aligning Large Language Models with Knowledge Tracing using a Plug-and-Play Instruction. https://arxiv.org/html/2502.02945

### Datasets

- Choi, Y., Lee, Y., Shin, D., Cho, J., Park, S., Cha, M., Kang, S., Lim, J., & Ha, S. (2020). EdNet: A Large-Scale Hierarchical Dataset in Education. *AIED*, 69–73. https://arxiv.org/pdf/1912.03072
- Feng, M., Heffernan, N., & Koedinger, K. (2009). Addressing the Assessment Challenge in an Online Learning Environment. *User Modeling and User-Adapted Interaction*, 19(3–4), 243–266.

### Practical Deployment

- Baker, R. S., et al. (2025). Practical Evaluation of Deep Knowledge Tracing Models for Use in Learning Platforms. *EDM* (Industry Track). https://educationaldatamining.org/EDM2025/

### Real-World Case Studies

- Duolingo Team (2023). AI-Driven Learning Personalization: How Duolingo Revolutionized Language Education. *Blog*. https://millennial.ae/
- ALEKS Corporation. *ALEKS: A Web-Based Assessment and Learning System*. Accessed online.

---

## Glossary

- **BKT:** Bayesian Knowledge Tracing; HMM-based model with interpretable parameters.
- **DKT:** Deep Knowledge Tracing; RNN-based model using LSTMs.
- **IRT:** Item Response Theory; logistic model of ability vs difficulty.
- **SAKT/AKT/SAINT:** Attention-based transformer models for KT.
- **Q-matrix:** Expert-defined table indicating which skills are needed for each problem.
- **DINA/DINO:** Cognitive diagnosis models for binary skill mastery.
- **Cold start:** Predicting for a new student with few observations.
- **Slip:** Student knows skill but answers wrong (error).
- **Guess:** Student doesn't know skill but answers right (luck).
- **Forgetting curve:** Ebbinghaus model of exponential memory decay over time.
- **Misconception:** Incorrect procedure or rule a student uses consistently.
- **Interaction density:** (Total interactions) / (Students × Problems). Pi.mn ≈ 0.5%.
