# Literature Review: Worked Examples, Cognitive Load, and Faded Scaffolding

**Research Domain:** Mathematics Education, Instructional Design, Cognitive Psychology  
**Scope:** Board-work pedagogy, scaffolding strategies, adaptive sequencing, step-level error diagnosis  
**Target System:** Pi.mn tutoring platform (359 students, ~6,000 problems, Mongolian 12th-grade mathematics)  
**Review Date:** August 2026  

---

## 1. Cognitive Load Theory (Sweller)

### Foundational Principles

Cognitive Load Theory (CLT) is the theoretical bedrock underlying all modern worked-example research. The theory posits that human working memory has **severely limited capacity** (~3–7 items simultaneously) and that learning occurs when extraneous cognitive load is minimized, freeing capacity for germane load (schema acquisition and transfer).

CLT distinguishes three types of cognitive load:
- **Intrinsic Load:** Inherent to the material and learner's prior knowledge (element interactivity)
- **Extraneous Load:** Imposed by instructional design; can be reduced via better presentation
- **Germane Load:** Devoted to schema construction and long-term learning

### Application to Worked Examples

Worked examples reduce extraneous load by eliminating the need for novice learners to search for the solution path, allowing them to focus on understanding the underlying principles and methods (Sweller & Cooper, 1985). This effect is particularly strong when:
- Learner has low prior knowledge
- Domain has high element interactivity (many interdependent steps)
- Problem is complex or ill-structured

### Limitations and Caveats

CLT applies best to **procedural, well-structured problem domains** (algebra, physics mechanics, programming). For:
- Creative or open-ended tasks, worked examples may reduce productive struggle
- Highly knowledgeable learners (see Expertise Reversal below), worked examples become redundant and wasteful
- Domains requiring deep conceptual reasoning, extraneous load reduction alone is insufficient

---

## 2. The Worked Example Effect: Meta-Analytic Evidence

### Overall Effect Size

A comprehensive 2023 meta-analysis (Barbieri, Miller-Cotto, & Clerjuste) reviewed **8,033 abstracts** and synthesized **43 peer-reviewed articles reporting 55 studies with 181 effect sizes** across elementary to postsecondary mathematics.

**Key Result:** Median effect size **g = 0.48** (95% CI, p < .01) — a **medium effect**. This means worked examples yield approximately half a standard deviation improvement over problem-solving-only or minimally-guided alternatives.

### Moderators and Boundary Conditions

#### Example Type
- **Correct examples alone:** Largest effect (g ≈ 0.55–0.60)
- **Incorrect examples alone:** Smaller but positive (g ≈ 0.40–0.45)
- **Mixed correct + incorrect:** Variable; depends on how errors are explained

**Implication for Pi.mn:** Showing only correct solutions is most straightforward and effective for novices. Introducing erroneous examples works *if* the teacher or system explicitly explains the error and its correction.

#### Self-Explanation Prompts
**Critical Finding:** The meta-analysis found that explicit self-explanation prompts **diminish** the effect of worked examples (g decreased by ~0.15–0.20 when prompts were added).

**Interpretation:** Highly constrained, mandatory self-explanations add germane (but still burdensome) load. Most effective is **optional** or **low-constraint** prompting—e.g., "What do you think the next step is?"—rather than detailed written explanations.

#### Grade Level and Domain
- **Algebra:** Strongest effects (g ≈ 0.50–0.60)
- **Geometry:** Moderate (g ≈ 0.40–0.50)
- **Advanced topics (calculus, proofs):** Weaker (g ≈ 0.30–0.40)
- **Elementary:** Strong but subject to more variability

**Implication for Pi.mn:** Worked examples will be most effective for 12th-grade algebra and coordinate geometry. For theoretical topics (limits, proofs), supplement with conceptual explanations and worked examples of *reasoning*, not just procedures.

### Study Quality and Sample Sizes

The 43 studies ranged from small classroom trials (n = 20–50) to quasi-experimental designs (n = 200–500). **None approached n > 1,000**, so:
- Estimates apply to typical classroom sizes (20–60 students per study)
- Heterogeneity across studies is substantial (Q > 500), suggesting context matters
- Effect is not universal; individual student factors (motivation, prior knowledge, learning strategy) introduce variance

---

## 3. Expertise Reversal Effect (Kalyuga)

### Core Finding

Slava Kalyuga demonstrated a striking reversal: instructional scaffolding (including worked examples) **helps novices but harms experts**.

- **Low prior knowledge learners:** Worked examples yield medium-to-large advantage (d = 0.60–2.00)
- **High prior knowledge learners:** Worked examples show **no benefit** or **negative effect** (d = −0.40 to 0.10)

### Mechanism

High-knowledge learners find worked-out steps **redundant**. Processing redundant information:
1. Induces wasted working-memory load (extraneous)
2. Prevents the learner from practicing *problem-solving*, which high-knowledge students still need for speed and automaticity
3. May feel patronizing, reducing motivation

### Meta-Analytic Evidence

A 2007 narrative review by Kalyuga examined **26 studies** and found consistent reversals with effect-size differences of **d = 0.45–2.99** between low and high prior knowledge groups—remarkable consistency across diverse domains (programming, industrial equipment, technical diagrams).

A recent meta-analysis (2025) formalizes this with systematic literature search and moderator analyses across age groups and domains. **The expertise reversal effect is now treated as a cornerstone of adaptive instructional design.**

### Implications for Pi.mn

**Critical for the platform:**
- Students must be diagnosed on a **per-topic basis** for prior knowledge / mastery
- Once a student achieves mastery (e.g., solves 3–5 problems correctly in a row), **fade or remove worked examples** and increase unsupported problem-solving
- A student may be "expert" in polynomials but "novice" in trigonometry; the system must track both
- Failure to fade scaffolding = retention of strong students' engagement will drop

**Decision rule:** Once accuracy on a topic reaches ~85–90% with decreasing latency, transition from examples-first to problems-first with optional hints.

---

## 4. Faded Worked Examples: Sequencing and Backward Fading

### Definition

Faded worked examples (completion problems) are a **graded sequence** where:
1. First item: Fully worked example (all steps shown)
2. Second item: Worked example with last 2–3 steps omitted (learner completes)
3. Third item: Last 5–6 steps omitted
4. Final items: Pure problem-solving with no scaffold

The sequence gradually shifts responsibility from the system to the learner.

### Backward Fading

Research by Renkl and Atkinson (2002–2004) compared **backward fading** (omit steps from the *end* of the solution first) to **forward fading** (omit from the *beginning*).

**Finding:** Backward fading is superior (g ≈ 0.40–0.60 on near-transfer tasks). Reason: novices can still see the problem setup and the major structural steps; they only fill in computational or detail-oriented final steps, reducing cognitive overload.

#### Near vs. Far Transfer

- **Near transfer** (similar problems): Fading yields reliable gains (g ≈ 0.40–0.60)
- **Far transfer** (novel problems, new contexts): Fading alone is inconsistent; effect sizes drop to g ≈ 0.10–0.25

**Key finding from Renkl et al. (2002):** Nine-grade electricity students learned near-transfer problems better with fading, but far-transfer gains appeared only when fading was **combined with self-explanation prompts** (see Section 5).

### Rate of Fading

**Question:** How fast should scaffolding fade?

**Limited direct evidence.** Existing studies use **3–5 fading steps per problem set** (one per problem). No randomized trials compare fading speed directly. **Common practice rule:** Fade one problem per 3–5 attempts; if accuracy drops below 70%, **pause fading** and re-introduce a fully worked example.

### Implications for Pi.mn

- **Implement backward fading:** For each topic, design 3–5 problems in a sequence, omitting steps from the end first
- **Embed fading in problem pairs:** Example → Example with gap → Full problem
- **Adapt fade rate per student:** If a student struggles (≤60% accuracy, high time-on-task, hints requested), insert a full example before the next problem
- **Track fading stage per topic:** Record which fading stage each student last succeeded on; use that as starting point for review

**Algorithm sketch:**
```
if (last_attempt.accuracy >= 0.85 AND last_attempt.timeSpent < median) {
  next_problem.fading_stage = min(current_stage + 1, max_fading_stages)
}
else if (last_attempt.accuracy < 0.70) {
  next_problem.type = FULL_WORKED_EXAMPLE
  next_problem.fading_stage = 0
}
else {
  next_problem.fading_stage = current_stage  // no change
}
```

---

## 5. Self-Explanation Prompts (Chi, Renkl)

### What Self-Explanation Does

Michelene Chi's foundational work (1989, 1994) identified a robust phenomenon: learners who **generate explanations** (self-explain) while studying examples learn better than those who simply read examples.

- **Good learners** spontaneously generate many self-explanations (inferences about *why* steps work)
- **Poor learners** read passively, memorizing surface features
- **Prompted learners** (asked "Why does this step follow?") can be induced to self-explain, raising performance to near "good learner" levels

### Effect Size

Meta-analysis of self-explanation across 64 research reports (69 effect sizes) found a **weighted mean effect of g = 0.55–0.66** — comparable to or slightly larger than the worked-example effect itself.

However, **effect moderation is crucial** (see below).

### Type of Prompt Matters

#### Highly Constrained Prompts
"Explain the next step" (multiple choice or fill-in-the-blank) adds **less germane load** but often yields weaker retention, especially for transfer.

#### Open-Ended Prompts
"Why does this work?" or "What is the general principle here?" forces **deep processing** but imposes higher germane load and requires careful scaffolding (hints if stuck).

#### Constraint × Prior Knowledge Interaction
- **Novices:** Benefit from moderately constrained prompts (e.g., "Is this a commutative or associative property?")
- **Advanced:** Benefit more from open-ended prompts; highly constrained prompts feel patronizing

### Critical Caveat from the Meta-Analysis

The 2023 meta-analysis found that **self-explanation prompts reduced the worked-example effect** (see Section 2). Proposed explanation:
- Mandatory written self-explanations add extraneous load (typing, organizing thoughts)
- Benefits accumulate only after the learner has internalized the material
- Prompts work best when **low-constraint, optional, and presented within 3–5 seconds of the learner's natural question**

### Implications for Pi.mn

- **Do not mandate written explanations.** Instead, use **optional, conversational prompts**: "What happens next?" or "Why does this rule apply here?"
- **Provide hints after 3 seconds of inactivity** rather than forcing an answer
- **Scaffold with multiple-choice options initially**, then fade to open-ended
- **Track which students self-explain unprompted** (good engagement signal) vs. require scaffolding (may indicate conceptual struggle or low engagement)
- **Use conversational AI sparingly.** A 1–2 sentence explanation is better than a chatbot dialogue (which adds cognitive load via navigation)

---

## 6. Completion Problems

### Definition and Effect

Completion problems are a variant of faded examples: students see *most* of the solution but must fill in one or more **critical steps**. For instance:
- "Here is a polynomial long-division setup. Complete the first quotient term."
- "Here is the derivation. Fill in the missing algebraic simplification."

### Research Evidence

Several studies compare completion problems to full worked examples:
- **On near-transfer tasks:** Completion problems yield comparable or slightly better retention than full examples (e.g., students remember the procedure equally well)
- **On far-transfer / conceptual tasks:** Completion problems show **larger gains** (effect sizes g = 0.30–0.50 vs. g = 0.10–0.20 for passive examples)

**Proposed mechanism:** Filling in a step forces the learner to *reconstruct* the principle, not just recognize it. This constructive effort supports deeper learning and transfer.

### Design Considerations

- **Omit the *most important* step, not the easiest one.** Omitting a computational detail teaches nothing; omitting the pivotal transformation step forces conceptual engagement
- **Provide just enough context** that the learner can solve the omitted step without guessing
- **Pair with feedback immediately** after submission

### Implications for Pi.mn

- **Completion problems are ideal for formative assessment.** Deploy one per topic, inserted after 2–3 fully worked examples
- **Use them to diagnose step-level understanding.** If a student fails a completion problem on, e.g., "applying the sign rule," flag that sub-skill for reteaching
- **Vary which step is omitted** across students (randomize within bounds) to prevent "memorized gaps"

---

## 7. Subgoal Labeling (Catrambone, Margulieux)

### What It Is

Subgoal labeling involves **partitioning a worked solution into meaningful chunks** and labeling each chunk with a descriptive, conceptual label rather than just "Step 3."

**Example (polynomial long division):**
- Subgoal 1: "Divide the leading terms" [a labeled block showing division]
- Subgoal 2: "Multiply divisor by quotient term" [a labeled block]
- Subgoal 3: "Subtract and bring down next term" [a labeled block]

Instead of just Step 1, 2, 3 (surface structure), the learner sees **conceptual landmarks**.

### Research Findings

Margulieux and Catrambone's work on 10+ studies in programming, mathematics, and STEM domains consistently shows:

- **Retention:** Students receiving labeled subgoals (either given or self-generated) retain procedures better (g ≈ 0.20–0.40 vs. unlabeled controls)
- **Transfer:** Labeled subgoals improve near-transfer (same type, new values) more than far-transfer
- **Cognitive load:** Subgoal labels help organize information and support self-explanation; no increase in extraneous load

#### Given vs. Self-Generated Labels

- **Given labels:** Better for near-transfer (similar problems) where the solution structure is predictable
- **Self-generated labels:** Better for far-transfer (novel problems) where the learner must identify the key structure themselves

### Implications for Pi.mn

- **Implement structural labels in worked examples.** For a multi-step problem (e.g., solving a quadratic by completing the square), label each major phase:
  - "Isolate the squared term"
  - "Manipulate to complete the square"
  - "Solve for x"
- **Teach the **solution structure explicitly** at the start of a chapter**, before worked examples, so students have a mental framework
- **For advanced topics, encourage students to generate their own subgoals** ("What was the main idea in that step?") as a self-assessment
- **Use labels in video and textbook explanations** too—they are not just for interactive examples

---

## 8. Productive Failure (Kapur)

### The Paradox

Productive failure is the counterintuitive finding that **struggling without direct instruction can lead to better learning than studying examples first**.

Kapur's methodology:
1. **Phase 1 (Productive Failure):** Students attempt novel, ill-structured problems in small groups *without teacher instruction* for 30–45 min. They fail to solve them but generate diverse representations and failed attempts.
2. **Phase 2 (Consolidation):** Teacher explains the key concepts and solution procedures.

**Compared to:** Traditional sequence (explanation → practice).

### Results

Two randomized controlled trials (Singapore, n = 75 and n = 100) found:
- **Procedural knowledge:** Both groups (productive failure and direct instruction first) achieved similar levels
- **Conceptual understanding:** Productive failure group *significantly better* (Cohen's d ≈ 0.50–0.80)
- **Transfer to novel problems:** Productive failure *significantly better* (d ≈ 0.60–1.00)

### Mechanism

Productive failure is hypothesized to work because:
1. **Encoding variability:** Attempting diverse approaches creates multiple internal representations, supporting transfer
2. **Failure-driven learning:** Cognitive conflict (noticing an approach doesn't work) motivates attention to the teacher's explanation
3. **Active schema construction:** The learner is primed to integrate the correct solution into a richer mental model

### Critical Limitations and Contested Results

1. **Effect dependent on consolidation quality:** If the teacher's explanation is unclear or too brief, productive failure offers no advantage
2. **Requires student engagement and psychological safety:** In demotivated classes or high-stakes settings, students may disengage during Phase 1
3. **Not universal across domains:** Most evidence is in mathematics (rate/speed, algebraic reasoning). Limited data in procedural skills (algebra symbol manipulation) or advanced topics
4. **Replication mixed:** Some studies fail to replicate strong transfer gains; effect sizes are often smaller on independent replication
5. **Conflict with low-prior-knowledge learners:** Productive failure can backfire for students with weak foundational skills—they may encode incorrect procedures or give up

**Contested:** Several meta-analyses note high publication bias toward productive failure studies, and effect sizes shrink when studies have high sample sizes or longer follow-ups.

### Implications for Pi.mn

**Use productive failure cautiously:**
- **Best suited for:** Higher-level reasoning (word problems, multi-step problem-solving, transfer scenarios)
- **Avoid for:** Foundational skills (arithmetic, basic algebra), or when students lack prerequisites
- **Implementation:** Pose a challenging problem, allow 5–10 min of unsupported exploration, then provide a worked example or explanation. Monitor for disengagement; if latency or hints exceed threshold, intervene earlier
- **Pair with immediate feedback:** After the exploratory phase, provide a correct solution and clear explanation of why prior approaches failed
- **Design problems carefully:** The problem must be *solvable with effort and creativity*, not impossible (which demoralizes)

---

## 9. Learning from Errors and Error-Based Instruction

### Theoretical Basis

Errors are informative events. When students receive **adaptive feedback on mistakes**, they can learn by:
1. Identifying the source of the error (conceptual? procedural? careless?)
2. Generating a correction or explanation
3. Integrating the corrected knowledge

### Evidence for Error-Based Learning

Several studies (Narciss & Huth, 2004; Dresel & Lämmli, 2025) found:
- **Interactive error feedback** (prompting reflection on *why* the error occurred) yields similar or greater gains than traditional problem-solving instruction
- **Error climate matters:** Classrooms where errors are reframed as learning opportunities show higher engagement and learning
- **Affective response is critical:** Students who feel shame or threat after errors show lower learning gains; students who feel curiosity show higher gains

### Careless Errors vs. Conceptual Errors

This distinction is crucial for Pi.mn's diagnostic goal:

| **Careless Error** | **Conceptual Error** |
|---|---|
| Student has the skill but misses it (e.g., drops a negative sign) | Student lacks understanding of the principle |
| Caused by: fatigue, distraction, rushing | Caused by: incomplete teaching, misconception, domain gap |
| Remedy: Point it out; student usually corrects immediately | Remedy: Reteach the principle, provide new examples |
| Pattern: Sporadic, random errors; few repeats on the same mistake type | Pattern: Systematic errors; repeats the same mistake across problems |

**For Pi.mn:** Label each error as **careless vs. conceptual** using the mistake-type taxonomy already in the database (SIGN_ERROR, INCOMPLETE_STEP, CALC_ERROR_NEAR, CONCEPT_GAP, etc.). Then:
- **Careless:** Brief nudge ("Check the sign on the second term")
- **Conceptual:** Full example + reteaching + verification problem

### Implications for Pi.mn

- **Do not just mark answers wrong.** Provide step-level error diagnosis and targeted feedback
- **Distinguish error types** using the existing MistakeType enum; implement feedback rules per type
- **Celebrate errors in communication:** Frame them as learning signals, not failures ("You caught an important case—here's why it works…")
- **Implement error recovery:** After an error, offer a hint or related worked example, then a similar but fresh problem to verify learning

---

## 10. Prerequisite Diagnosis and Adaptive Skill Sequencing

### The Prerequisite Problem

A student fails a test on quadratic equations. Is it because they:
1. Don't know how to factor trinomials? (prerequisite)
2. Don't understand the relationship between factors and roots? (conceptual gap)
3. Forgot how to use the quadratic formula? (retrieval gap)
4. Didn't engage (rushing, distraction)?

Without diagnosis, reteaching often misses the target.

### Diagnostic Approaches

#### Cognitive Diagnosis Models (CDMs)
CDMs infer a learner's mastery of a **vector of fine-grained skills** (not just a single score). For example, solving a quadratic might require:
- Skill: Factor trinomials
- Skill: Apply the zero-product property
- Skill: Solve linear equations
- Skill: Simplify radicals

A CDM estimates the probability that a student has mastered each skill, given their response pattern. **Q-matrix** (skill-by-problem mapping) specifies which skills each problem requires.

**Advantage:** If a student fails a problem that requires Skills A, B, C and passes problems requiring A, B, they likely lack C.

#### Implementation Complexity
- Requires careful Q-matrix construction (each problem must be analyzed for required skills)
- Early problems give sparse information; early estimates are unreliable
- Mastery thresholds are arbitrary (often set at P(mastery) > 0.70 or > 0.85)

### Data Requirements

For **reliable skill diagnosis with 359 students and ~6,000 problems:**
- **Minimum per student-skill pair:** 3–5 observations (attempts on problems requiring that skill)
- **Sparse data regime:** If each student solves only ~40–60 problems, they have sparse coverage across ~200+ distinct skills
- **Practical rule:** Build hierarchical Q-matrices (group skills into broader categories initially, then refine)

### Mastery Thresholds

Recent work (EDM 2025) examined "How much mastery is enough?" with **n ≈ 1000+ students in online systems**:
- **Threshold of 0.85 (85% accuracy):** Traditional, widely used
- **Threshold of 0.95:** Leads to higher performance in subsequent lessons (small but reliable effect)
- **Threshold of 0.98:** Further gains, but diminishing returns and risk of over-drilling

**For Pi.mn:** Start with 0.85; monitor if students passing at this level succeed in downstream topics. If not, raise to 0.90.

### Implications for Pi.mn

- **Build a skill Q-matrix:** Map each problem to its required skills (at least 3–5 levels: Arithmetic → Algebra I → Algebra II → Geometry → Functions)
- **Implement CDM diagnostics progressively:** Start simple (binary skill mastery from first 3 problems), then refine as more data accumulates
- **Use prerequisites to scaffold:** If a student fails on quadratic equations, offer a targeted review problem on factoring before reattempting
- **Combine with error analysis:** If a student fails on a problem requiring "Apply zero-product property," and the error was CONCEPT_GAP, assign a 2–3 minute worked-example video on that specific skill
- **Re-diagnose after intervention:** After reteaching, give a fresh problem from the same skill before advancing

---

## 11. Spaced Retrieval Practice and Scheduling

### The Spacing Effect

Studying the same material in **spaced sessions** (1 day, 3 days, 1 week, 2 weeks apart) yields dramatically better long-term retention than massed practice (all in one session).

- **Optimal timing:** Expand the gap gradually (each gap ~1.5–2× the prior gap)
- **Example schedule:** Review after 1 day, then 3 days, then 1 week, then 2–4 weeks
- **Effect size:** Spacing typically yields d ≈ 0.70–1.50 compared to massed practice (very large)

### Adaptive Spacing Algorithms

Duolingo's approach (2016 paper by Settles & Meeder):
1. Train a **predictive model** of forgetting on each word for each user
2. Model: Predict P(user will remember item at time t) using features: prior accuracy, time since last review, number of prior reviews, difficulty, etc.
3. **Scheduling rule:** Present items in order of **predicted probability of forgetting**, prioritizing items the model thinks the user is likely to forget

**Effect in deployment:** Duolingo's spacing algorithm reduced study time by ~20% while maintaining or improving retention.

### Anki FSRS (Free Spaced Repetition Scheduler)

Anki (open-source flashcard tool) recently implemented FSRS, a machine-learning scheduler that:
- Learns parameters from user's historical data (how long does *this user* retain *this item*)
- Optimizes for a user-defined target retention rate (e.g., 95%)
- Schedules reviews to hit that target while minimizing total time

**For 359 students with ~10–20 reviews per skill:** FSRS-style approaches are feasible and likely more efficient than fixed schedules.

### Implications for Pi.mn

- **Implement spaced retrieval scheduling** for evening self-reports and homework problems
- **Use a simple adaptive algorithm:**
  ```
  if (last_attempt.accuracy >= 0.90) {
    next_review_date = today + 3 days  // first review
  } else if (second_review_passed) {
    next_review_date = today + 7 days  // second review
  } else if (third_review_passed) {
    next_review_date = today + 14 days  // maintenance
  }
  // If accuracy < 0.90, reset to first review schedule
  ```
- **Prioritize reviews of items with lowest P(remember).** If a student last solved Problem X (on polynomial division) 10 days ago with 85% accuracy, and Problem Y (on factoring) 5 days ago with 95%, present Problem X next
- **Combine with topic structure.** Don't space reviews randomly; space within **topic clusters** (e.g., all "factoring" variants together, with gaps between topics)

---

## 12. Data Requirements and Sparse Data Challenges

### How Much Data Is Needed?

This is critical for Pi.mn, which has:
- **Students:** 359
- **Problems:** ~6,000
- **Attempts:** Sparse; each student solves perhaps 40–100 problems during the school year
- **Self-reports:** Evening self-reports (SOLVED_CLEAN, FIXED_AFTER_ERROR, FAILED, GUESSED) are high-level; often lack step-level detail

#### For Knowledge Tracing (Skill Mastery)
- **Per skill-student pair:** At least 3–5 observations (attempts) for reliable estimates
- **Implication:** With 359 students and 200 distinct skills (conservative estimate), need ≥ 200 × 5 × 359 ≈ 359,000 attempts system-wide. Current data may only have 20,000–50,000 attempts.
- **Solution:** Build hierarchical skills (5–10 broad categories), not fine-grained (200+)

#### For Error Diagnosis (Step-Level Labeling)
- **Per error pattern:** Need 5–10 examples to confidently classify as "common mistake" vs. "noise"
- **Implication:** If 50 students solve a problem and 5 make a SIGN_ERROR, that's weak evidence that this is a systemic misconception. Need ~30–50 instances before triggering a pedagogical intervention
- **Solution:** Aggregate data across problem variants (all "sign rules" problems, not just one)

#### For Worked Example Sequencing
- **Per fading stage:** Track ~20–30 student attempts to establish if that stage is effective
- **Implication:** Will take weeks or months to collect enough data to confidently adjust fading
- **Solution:** Start with evidence-based defaults (e.g., Renkl's 3–5 fading steps per topic) and adjust slowly

### Mitigating Sparse Data

1. **Aggregate across problem variants:** Don't learn skills per problem; learn per topic/skill category
2. **Use informed priors:** Incorporate teacher domain knowledge (e.g., "All students struggle with sign rules") as priors in Bayesian models
3. **Transfer learning:** If data on "quadratic equations" is sparse but "linear equations" is rich, use the latter to inform priors for the former
4. **Temporal aggregation:** Pool data across multiple cohorts (year 1, year 2, etc.) if possible
5. **Teacher labeling:** Lean on teachers' manual MistakeType labels rather than trying to infer error types fully automatically

### Contested Claims: Deep Learning on Small Data

Some vendors claim deep neural networks can learn robust student models from "small data." **Be skeptical:**
- Neural networks typically need 1000+ examples per class to avoid overfitting
- With 359 students and ~20–40 attempts each, you have ~7,000–14,000 total attempts—marginal for deep learning
- Simpler Bayesian models (e.g., Bayesian Knowledge Tracing) are more transparent and work better with sparse data
- **Verdict:** For Pi.mn, stick with interpretable Bayesian or rule-based models; avoid black-box deep learning

---

## 13. Algorithms and Concrete Sequencing Rules for Pi.mn

### Goal-Level Objectives
1. **Step-level error diagnosis:** Identify not just "wrong answer" but *which step and which skill failed*
2. **Distinguish error types:** Careless vs. conceptual, engagement signals
3. **Adaptive scaffolding:** Fade examples as competence grows; intensify for struggling students
4. **Prerequisite closing:** When a student fails, offer targeted reteaching on the prerequisite
5. **Spacing:** Schedule reviews of past topics to combat forgetting

### Algorithm 1: Adaptive Fading and Worked Example Sequencing

```
function selectNextProblem(studentId, topic):
  prior_mastery = estimateMastery(studentId, topic)
  error_history = getErrorHistory(studentId, topic)
  
  // Diagnosis: Have they passed this topic?
  if (prior_mastery >= 0.85) {
    // Advanced: problem-first, optional hints
    return selectProblem(topic, type=UNSUPPORTED, difficulty=CURRENT+1)
  }
  
  // Mid-level: use fading
  else if (prior_mastery >= 0.60):
    fading_stage = min(3, numSuccessesInRow / 2)  // one stage per 2 successes
    return selectProblem(topic, type=FADED, fading_stage=fading_stage)
  
  // Struggling: worked examples
  else:
    last_error_type = error_history[−1].type  // most recent error
    if (last_error_type in [CONCEPT_GAP, INCOMPLETE_STEP]):
      return selectWorkedExample(topic, subgoalLabel=true)
    else if (last_error_type == SIGN_ERROR):
      return selectWorkedExample(topic, emphasizeRule="sign rules")
    else:
      return selectWorkedExample(topic, type=FULL)
  
  // Special case: low engagement (latency > 2× median, many hints, guessed)
  if (engagement_risk(studentId, topic)):
    return selectWorkedExampleWithVideo(topic, pitchLevel=BEGINNER)
```

### Algorithm 2: Error Diagnosis and Feedback Routing

```
function processStudentResponse(studentId, problemId, givenAnswer, timeSpent):
  correctAnswer = getProblemAnswerKey(problemId)
  
  if (givenAnswer == correctAnswer):
    recordSuccess(studentId, problemId, timeSpent)
    return
  
  // Error occurred
  error = analyzeError(givenAnswer, correctAnswer, problemId)
  // error.step, error.type, error.skills_involved
  
  // Determine remediation level
  if (error.type == CARELESS):
    feedback = "Check the [STEP]. The sign/coefficient should be..."
    next_action = SAME_PROBLEM  // retry allowed
  
  else if (error.type == CONCEPT_GAP):
    // Find prerequisite
    prerequisite_skill = getPrerequisite(error.skill)
    feedback = "This step uses [RULE]. Let's review..."
    next_action = WORKED_EXAMPLE(prerequisite_skill)
  
  else if (error.type == SIGN_ERROR):
    feedback = "Watch out for the sign rule here..."
    next_action = WORKED_EXAMPLE_SNIPPET(error.skill)
  
  // Aggregate for pattern detection
  recordError(studentId, error.step, error.type, error.skill)
  
  if (countErrors(studentId, error.skill) >= 3):
    flagForTeacherReview(studentId, skill=error.skill, reason="Repeated conceptual errors")
```

### Algorithm 3: Prerequisite-Closing Intervention

```
function offerPrerequisiteIntervention(studentId, failedTopic):
  failed_skills = inferSkillsFromError(failedTopic)
  
  for each skill in failed_skills:
    mastery = estimateMastery(studentId, skill)
    
    if (mastery < 0.75):
      // Offer brief review
      intervention = {
        type: "skill_review",
        skill: skill,
        content: [
          workedExample(skill, count=1),
          completionProblem(skill, count=1),
          unsupportedProblem(skill, count=2)
        ],
        timeout: 10 minutes  // keep it short
      }
      presentIntervention(studentId, intervention)
      
      // Re-attempt original topic after review
      scheduleNextAttempt(studentId, failedTopic, delay=5_minutes)
```

### Algorithm 4: Spaced Retrieval Scheduling

```
function scheduleNextReview(studentId, topicId, lastAttemptAccuracy):
  mastery = estimateMastery(studentId, topicId)
  last_review_date = getLastReviewDate(studentId, topicId)
  days_since = today - last_review_date
  
  if (lastAttemptAccuracy >= 0.90):
    // Spacing schedule based on review count
    review_count = countSuccessfulReviews(studentId, topicId)
    
    if (review_count == 0):
      gap_days = 1    // first review: tomorrow
    else if (review_count == 1):
      gap_days = 3    // second review: 3 days later
    else if (review_count == 2):
      gap_days = 7    // third review: 1 week later
    else:
      gap_days = 14   // maintenance: 2 weeks
    
    next_review = today + gap_days days
  
  else if (lastAttemptAccuracy < 0.70):
    // Reset spacing; re-enter learning cycle
    gap_days = 0      // review ASAP
    next_review = today  // flag for immediate repeat
  
  else:
    // 70–90% accuracy: no change
    next_review = last_review_date + 7 days
  
  scheduleReview(studentId, topicId, next_review)
```

### Algorithm 5: Engagement and Motivation Monitoring

```
function monitorEngagement(studentId, recentAttempts):
  // Flags indicating disengagement or risk
  flags = {}
  
  // Check latency (time on task)
  avg_latency = mean(recentAttempts.timeSpent)
  class_median_latency = getClassMedianLatency()
  
  if (avg_latency > 3 * class_median_latency):
    flags.slow = true  // stuck or daydreaming?
  
  if (avg_latency < 5 seconds and accuracy < 0.50):
    flags.rushing = true  // guessing?
  
  // Check hint usage
  hint_ratio = countHintsUsed / countProblemsAttempted
  if (hint_ratio > 0.7):
    flags.help_seeking = true  // heavy reliance
  
  // Check self-reported state (evening reports)
  if (recentSelfReports.state == GUESSED in > 50% of reports):
    flags.guessing_pattern = true
  
  // Take action
  if (flags.slow or flags.help_seeking):
    // Offer simpler, scaffolded problems
    suggestWorkflowAdjustment(studentId, "Try a worked example first")
  
  if (flags.rushing):
    // Encourage pacing
    suggestWorkflowAdjustment(studentId, "Take your time and check each step")
  
  if (flags.guessing_pattern and countFailures > 5):
    // Alert teacher
    notifyTeacher(studentId, message="Possible disengagement or prerequisite gap detected")
```

---

## 14. Implementation Recommendations for Pi.mn

### Priority 1: Step-Level Error Diagnosis

**Current state:** Errors are labeled by teachers using MistakeType enum (SIGN_ERROR, CONCEPT_GAP, etc.) but often at the answer level, not step level.

**Recommendation:**
1. Extend the error-labeling schema to include step index: e.g., `{step: 3, type: SIGN_ERROR, skill: "multiplication_rule"}`
2. Train teachers to label step-level mistakes during classroom marking (they already do this verbally; formalize it)
3. Use these labels as ground truth to train simple rule-based error classifiers (if answer is signed oppositely, flag SIGN_ERROR in steps involving multiplication, etc.)
4. Display step-level error diagnosis to students in feedback

### Priority 2: Implement Fading Sequences

**Current state:** Problems are likely standalone; no explicit fading sequence.

**Recommendation:**
1. For each major topic (polynomials, quadratic equations, trigonometry, etc.), design 4–5 problems in a fading sequence:
   - Problem 1: Full worked example
   - Problem 2: Worked example with last 2 steps omitted
   - Problem 3: Worked example with last 3–4 steps omitted
   - Problem 4: Unsupported problem with optional hints
   - Problem 5: Unsupported problem, no hints
2. Assign problems in order; if accuracy drops, re-insert a fuller example
3. Label each problem with its fading stage in the database

### Priority 3: Prerequisite Mapping and Diagnosis

**Current state:** Topics are loosely hierarchical (Book > Chapter > Topic > Problem); no explicit prerequisite links.

**Recommendation:**
1. Build a prerequisite graph: Quadratic Equations → Factoring, Completing the Square, Square Roots, Linear Equations
2. Assign each problem a Q-matrix (list of required skills)
3. When a student fails a problem, infer which prerequisite(s) they likely lack and offer a brief review
4. Prioritize the most impactful prerequisites (e.g., "Sign rules" is a prerequisite for many topics)

### Priority 4: Spaced Retrieval Scheduling

**Current state:** Students review topics when assigned homework; no adaptive spacing.

**Recommendation:**
1. Implement a simple spacing schedule (1 day, 3 days, 7 days, 14 days) for topics a student has attempted
2. Each evening, suggest 2–3 review problems for the student based on the spacing schedule
3. Track mastery threshold (85% accuracy); once achieved, move review to 14-day cycle
4. As more data accumulates, personalize spacing intervals based on individual forget rate

### Priority 5: Teacher Feedback and Alerts

**Current state:** Teachers see summary statistics (accuracy per student per topic); limited actionable insights.

**Recommendation:**
1. Flag students with repeated errors in the same skill or step (after 3+ errors)
2. Alert teachers to prerequisite gaps: "Student X failed on quadratic equations; likely gap in factoring"
3. Highlight engagement risks: "Student X's latency is 3× class median; disengagement risk"
4. Provide suggested interventions: "Offer a 2-minute worked example on sign rules"

---

## 15. Cautions and Limitations

### Not a Universal Panacea

Worked examples, fading, and spacing are **not panaceas**. They work best for:
- Procedural, well-structured skills (algebra, computation)
- Novice to intermediate learners
- In-school settings with regular engagement

They are **less effective for:**
- Open-ended reasoning (proof-writing, essay composition)
- Deep conceptual understanding without practice
- Highly motivated, self-directed learners (who may benefit from challenge more than scaffolding)

### Data Scarcity

With 359 students and ~6,000 problems:
- **Fine-grained skill diagnosis is unreliable** until you accumulate 2–3 years of data
- **Early personalization will be noisy;** rely on teacher input as a regularizer
- **Deep learning models are not justified;** simpler Bayesian approaches are more transparent and work better

### Engagement and Motivation

Research from motivational psychology shows that scaffolding can backfire if:
- Students perceive it as condescending
- It removes autonomy or agency
- It signals low teacher expectations ("You need examples; others don't")

**Recommendation:** Frame scaffolding as *normative support* ("Everyone gets a worked example to start; experts move on faster"), not as remediation.

### Transfer is Hard

Large effect sizes for worked examples apply to **near transfer** (similar problems in the same context). **Far transfer** (applying the skill to a novel domain or problem type) is much harder to achieve. Fading, self-explanation, and subgoal labeling help, but even combined, far-transfer gains are often modest (g = 0.20–0.40).

**Implication:** Don't expect a student who masters quadratic equations to automatically master word problems involving quadratics. Explicit instruction and examples on the word-problem variant are needed.

### Sparse Self-Reports

Evening self-reports (SOLVED_CLEAN, FIXED_AFTER_ERROR, GUESSED) are rough approximations. A student might:
- Mark FIXED_AFTER_ERROR but actually just re-guessed and got lucky
- Mark SOLVED_CLEAN despite minor slips or partial understanding
- Mark GUESSED when they actually reasoned through it but lack confidence

**Recommendation:** Weight these reports with lower confidence initially. As more attempt data accumulates, validate self-reports against actual problem accuracy.

### Adaptation vs. Explainability

Adaptive sequencing algorithms (especially machine-learning-based ones) can be opaque to teachers. Teachers need to understand *why* a student is being offered a particular problem.

**Recommendation:** Always pair algorithmic decisions with a brief explanation: "Problem X is suggested because you struggled with factoring on Problem Y. This worked example reviews that skill."

---

## 16. Gaps in the Literature and Research Needs

### Unanswered Questions Specific to Pi.mn's Context

1. **Sparse, classroom-level data:** Most worked-example and fading studies have n ≥ 50 students. Generalizing to smaller classes (e.g., 15–30 students) with sparse attempts is unclear.

2. **Cross-domain prerequisites:** Quadratic equations depend on polynomials, linear equations, and factoring. How should the system prioritize which prerequisite to teach first when multiple gaps are detected?

3. **Engagement signals from self-reports:** How reliable are evening self-reports (GUESSED, FIXED_AFTER_ERROR) as labels for learning outcomes? No study I found directly compared self-reported states to actual performance on delayed tests.

4. **Fading speed tuning:** How fast should examples fade for a class with mixed prior knowledge? Existing studies assume fairly homogeneous cohorts.

5. **Cultural and linguistic factors:** Most worked-example studies are in English or standardized testing contexts. How do findings transfer to Mongolian language instruction and the ЭЕШ exam format?

### Recommended Pilot Studies for Pi.mn

1. **Fading adaptation trial (n = 2 classes, ~60 students):** Randomly assign one class to fixed fading (all topics follow the same 3–5 step sequence) and one to adaptive fading (adjusts based on accuracy). Measure retention and transfer at end of chapter.

2. **Prerequisite intervention RCT (n = 3–4 classes, ~100 students):** When students fail a topic, randomly assign to either (a) immediate prerequisite review + reattempt, or (b) control (traditional reteaching). Measure success rate on second attempt and retention 2 weeks later.

3. **Self-report validation study (n = 359 all students):** Correlate evening self-reports (GUESSED, SOLVED_CLEAN, etc.) with next-day test performance on the same skill. Quantify reliability.

4. **Engagement monitoring calibration (n = 50–100 students):** Collect latency, hint-use, and self-report data; correlate with teacher observations of engagement during class. Calibrate thresholds for "disengagement risk."

---

## 17. Summary of Key Findings and Effect Sizes

| **Intervention** | **Effect Size (g or d)** | **Confidence** | **Sample Size Range** | **Notes** |
|---|---|---|---|---|
| Worked examples vs. problem-solving | 0.48 | High | 8,033 abstracts → 181 effect sizes | Meta-analysis 2023; medium effect; strongest for algebra |
| Fading (near-transfer tasks) | 0.40–0.60 | Medium | Multiple small studies | Effect diminishes for far-transfer |
| Self-explanation prompts | 0.55–0.66 | High | 64 studies, 69 effect sizes | Moderated by constraint level and domain |
| Expertise reversal (low vs. high prior knowledge) | 0.45–2.99 | High | 26 studies | Large reversal; tailoring essential |
| Completion problems vs. full examples | 0.30–0.50 | Medium | <10 published studies | Stronger for far-transfer; under-studied |
| Subgoal labeling | 0.20–0.40 | Medium | ~10 studies | Helps organization; modest effect |
| Productive failure (with consolidation) | 0.50–1.00 | Medium–Low | ~5 RCTs; mixed replications | Contingent on good consolidation; contested |
| Spaced retrieval vs. massed practice | 0.70–1.50 | High | 100+ studies over decades | Very large effect; well-established |
| Error-based learning (with feedback) | 0.30–0.60 | Medium | ~15 studies | Context-dependent; requires good feedback |
| Mastery threshold effect (0.95 vs. 0.85) | ~0.20 | Low–Medium | 1 study (n ~1000) | Small but real; needs replication |

---

## 18. References and Source Index

### Worked Examples and Meta-Analysis
1. **Barbieri, C. A., Miller-Cotto, D., Clerjuste, S. N., & Chawla, K. (2023).** A meta-analysis of the worked examples effect on mathematics performance. *Educational Psychology Review*, 35, 11. https://doi.org/10.1007/s10648-023-09745-1
   - *Key findings:* g = 0.48, 43 articles, 181 effect sizes; moderated by example type and self-explanation prompts

2. **Sweller, J., & Cooper, G. A. (1985).** The use of worked examples as a substitute for problem solving in learning algebra. *Cognition and Instruction*, 2(1), 59–89.
   - *Foundational:* Original worked-example effect; CLT basis

3. **Atkinson, R. K., Renkl, A., & Merrill, M. M. (2003).** Transitioning from studying examples to solving problems: Effects of self-explanation prompts and fading worked-out steps. *Journal of Educational Psychology*, 95(4), 774–783.
   - *Key findings:* Fading + self-explanation yield medium effects on transfer; backward fading is superior

### Expertise Reversal Effect
4. **Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003).** The expertise reversal effect. *Educational Psychology Review*, 15(2), 89–109.
   - *Foundational:* Demonstrates reversal across domains; effect sizes d = 0.45–2.99

5. **Gerjets, P., Scheiter, K., & Catrambone, R. (2004).** Designing instructional examples to reduce intrinsic cognitive load: Molar versus modular presentation of solution procedures. *Instructional Science*, 32(1), 33–58.
   - *Application:* Modularity as a design principle when expertise reversal is a concern

### Self-Explanation and Chi
6. **Bisra, K., Liu, Q., Nesbit, J. C., Salimi, F., & Winne, P. H. (2018).** Inducing self-explanation: A meta-analysis. *Educational Psychology Review*, 30(3), 703–725.
   - *Key findings:* g = 0.55–0.66 weighted mean; 69 effect sizes; moderated by task type and constraint level

7. **Chi, M. T. H., de Leeuw, N., Chiu, M. H., & LaVancher, C. (1994).** Eliciting self-explanations improves understanding. *Cognitive Science*, 18(3), 439–477.
   - *Foundational:* Good learners self-explain; prompting can induce it

### Fading and Scaffolding
8. **Renkl, A., Atkinson, R. K., Maier, U. H., & Staley, R. (2002).** From studying examples to solving problems: Fading worked-out solution steps helps learning. *Instructional Science*, 30(3), 217–253.
   - *Key findings:* Backward fading reliably helps near-transfer; far-transfer requires combination with other strategies

9. **Schwonke, R., Berthold, K., & Renkl, A. (2009).** How multiple external representations are used and how they affect performance in subsequent problem solving. *Applied Cognitive Psychology*, 23(3), 355–371.
   - *Application:* Multiple representations (diagrams, symbols) in worked examples

### Subgoal Labeling
10. **Catrambone, R. (1998).** The subgoal learning model: Creating better examples so students can solve novel problems. *Journal of Experimental Psychology: General*, 127(4), 355–376.
    - *Foundational:* Subgoals enhance problem-solving transfer

11. **Margulieux, L. E., Catrambone, R., & Guzdial, M. (2016).** Subgoal-labeled instructional material improves performance and transfer in learning to develop mobile applications. *Proceedings of the 2016 ACM Conference on International Computing Education Research*, pp. 93–102.
    - *Application:* Systematic testing in programming education

### Productive Failure
12. **Kapur, M. (2014).** Productive failure in learning from generation and invention activities. *Instructional Science*, 42(4), 519–530.
    - *Foundational:* Core productive failure theory and evidence; large effects on conceptual understanding

13. **Roll, I., & Wylie, R. (2016).** Evolution and revolution in artificial intelligence in education. *Journal of Educational Data Mining*, 8(1), 1–28.
    - *Critical review:* Discusses productive failure in context of broader learning design; notes limitations and contexts for application

### Error Analysis and Learning
14. **Narciss, S., & Huth, K. (2004).** How to design informative tutoring feedback for multimedia learning. *Handbook of Research on Educational Communications and Technology*, 2, 181–195.
    - *Framework:* Error types and feedback design

15. **Dresel, M., & Lämmli, J. (2025).** Learning from errors in mathematics classrooms: Development over 2 years in dependence of perceived error climate. *British Journal of Educational Psychology*, in press.
    - *Recent:* Error climate matters for adaptive reactions; classroom culture is key

### Knowledge Tracing and Sparse Data
16. **Pelánek, R. (2017).** Bayesian knowledge tracing, item response theory, and variants of the model: A comprehensive review. *Frontiers in Psychology*, 8, 1518.
    - *Survey:* Knowledge tracing methods and their assumptions

17. **Gao, L., Fan, W., Zhang, S., Gong, D., Huang, M., Liu, H., ... & Fang, X. (2024).** A Dual-Encoder Contrastive Learning Model for Knowledge Tracing. *Entropy*, 27(7), 685.
    - *Recent:* Addressing sparse data with contrastive learning; empirical validation

### Spacing and Retrieval Practice
18. **Cepeda, N. J., Coburn, N., Rohrer, D., Wixted, J. T., Morey, M. C., & Bjork, R. A. (2006).** Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380.
    - *Meta-analysis:* Spacing effect size d > 1.0; highly robust

19. **Settles, B., & Meeder, B. (2016).** A trainable spaced repetition model for language learning. *Proceedings of the 54th Annual Meeting of the Association for Computational Linguistics*, pp. 1848–1858.
    - *Application:* Duolingo's adaptive spacing algorithm; practical implementation

### Prerequisite Diagnosis
20. **Tatsuoka, K. K. (1983).** Rule space: An approach for dealing with misconceptions based on item response theory. *Journal of Educational Measurement*, 20(4), 345–354.
    - *Foundational:* Cognitive diagnosis models (CDMs) and Q-matrix

21. **How Much Mastery is Enough Mastery? (2025).** Proceedings of the 18th International Conference on Educational Data Mining.
    - *Recent:* Mastery threshold effects; 0.95 vs. 0.85

---

## 19. Conclusion

For the Pi.mn platform, the literature strongly supports:

1. **Worked examples are effective** (g = 0.48) for novice learners in mathematics, but expertise reversal is real—fade aggressively as competence grows.

2. **Fading is practical and beneficial** for the transition from guided to independent problem-solving, but its benefits decay sharply for far-transfer tasks without additional support (e.g., self-explanation, subgoal labeling).

3. **Self-explanation matters but is fragile:** Low-constraint, optional prompts work; mandatory essays do not.

4. **Step-level error diagnosis is essential.** Moving beyond "answer is wrong" to "step 3 is wrong due to sign error" enables targeted intervention.

5. **Prerequisite mapping and adaptive review** can close gaps efficiently, especially with spaced scheduling.

6. **Data is sparse but sufficient for basic personalization.** Use hierarchical skill models, aggregate across problem variants, and lean on teacher labels as regularization.

7. **Engagement monitoring matters.** Latency, hint-seeking, and self-reported guessing are imperfect but usable signals of disengagement or prerequisite gaps.

8. **Productive failure is conditional.** Use it selectively for higher-level reasoning; avoid for foundational skills or at-risk learners.

This review synthesizes 20+ peer-reviewed sources and provides actionable algorithms for implementation. Pilot studies on fading speed, prerequisite prioritization, and self-report validation are recommended to refine the approach for Pi.mn's unique context (359 students, sparse data, Mongolian language, ЭЕШ exam goals).

