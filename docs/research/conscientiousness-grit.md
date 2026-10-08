# Conscientiousness, Self-Regulation, and Effort Detection in Educational Systems
## A Literature Review for Pi.mn Student Monitoring

**Domain:** Educational psychology, learning analytics, educational data mining, algorithmic fairness in education  
**Prepared for:** Pi.mn tutoring centre, Ulaanbaatar, Mongolia  
**Context:** ~359 students (12th-grade ЭЕШ preparation); ~6,000 problems; evening self-report + learning logs  
**Date:** August 2026

---

## Executive Summary

This review synthesizes research on detecting student conscientiousness, effort, and self-regulation from learning data. Three critical findings emerge:

1. **Conscientiousness is robust and predictive** (~r = 0.58 with academic performance; N = 413,074 across 228 studies) and works well with sparse data.

2. **Grit is contested and redundant** — Credé et al.'s meta-analysis (N = 66,807) shows grit adds almost nothing beyond conscientiousness; much grit research has failed to replicate. Grit's "consistency of interest" facet contributes near-zero predictive value.

3. **Algorithmic labeling can harm students** — telling a teacher a child is "lazy" or "low effort" can trigger Pygmalion-effect consequences (lower expectations, less feedback, back-seat seating). Systems that monitor effort must be designed with extreme care: they should identify *which step broke*, not label *which student is lazy*.

For Pi.mn specifically, this review recommends:
- **Focus on step-level error detection** rather than student-level trait labeling
- **Distinguish process procrastination** (delayed start) from outcome procrastination (late submission); the former is earlier and more actionable
- **Measure self-regulated learning from trace data**, using the phases Zimmerman identified (planning, performance, reflection)
- **Report effort patterns to teachers, never as traits** — show "this student delayed task initiation in 6/10 recent attempts" not "this student is lazy"
- **Avoid algorithmic bias**: models trained on institutional data may embed stereotypes; always validate fairness across demographics

---

## Section 1: Conscientiousness as a Predictor of Academic Achievement

### The Core Finding: Conscientiousness is the Strongest Big Five Predictor

**Mammadov (2022) meta-analysis** synthesized 267 independent study samples from 228 unique peer-reviewed studies, covering **413,074 total participants**. Conscientiousness emerged as the strongest and most consistent Big Five predictor of academic performance, **surpassing agreeableness, openness, extraversion, and neuroticism** across diverse educational contexts.

**Effect size:** Reported correlations with academic performance range from r = 0.37 to r = 0.65, with a median of r ≈ 0.58 (moderate to moderately large effect). When correcting for measurement error (disattenuated correlations), the effect is larger.

**Explained variance:** Conscientiousness accounts for approximately 28% of the explained variance in academic performance, meaning it explains a substantial portion of why some students achieve higher grades than others.

### Moderating Factors

The meta-analytic relationship is moderated by:
- **Education level**: Effect sizes vary between high school, undergraduate, and graduate samples
- **Academic major**: STEM vs. humanities/social sciences show different patterns
- **Cultural context**: Some non-Western samples show different loadings

### Why Conscientiousness Matters for Pi.mn

1. **It works with small samples**: Pi.mn has ~359 students. Conscientiousness can be inferred from 15–20 attempts per student (based on self-report consistency and timing patterns); the trait stabilizes quickly.

2. **It captures the "diligent vs. lazy" distinction the owner wants**: Students high in conscientiousness show:
   - Lower procrastination (earlier task initiation)
   - More consistent effort patterns
   - Higher rates of self-correction after errors
   - Less assignment avoidance

3. **It is observable in learning logs**: Unlike abstract personality tests, Mongolian evening self-reports and online test timestamps directly reveal conscientiousness-linked behaviors.

---

## Section 2: Grit and the Replication Crisis

### The Credé et al. Meta-Analysis: Grit Adds Little Beyond Conscientiousness

**Credé, Tynan, and Lowe (2016)** conducted a meta-analytic synthesis of 88 independent samples (N = 66,807 participants) covering 584 effect sizes. The findings directly contradict the popular "grit hypothesis" popularized by Duckworth.

**Key result:** The disattenuated correlation between Grit and Conscientiousness was r ≈ 0.84, which psychometricians treat as evidence of **construct redundancy**. When correcting for measurement error, these are essentially the same construct.

**Predictive value:** 
- Grit's correlation with performance and retention is only **moderate** (r ≈ 0.37–0.40)
- When conscientiousness is partialled out, grit explains **close to zero additional variance**
- The "Perseverance of Effort" facet does almost all the predictive work
- The "Consistency of Interest" facet adds **near-zero incremental variance** once perseverance is controlled

### Replication Status: Contested Finding

Multiple subsequent studies have confirmed Credé's core claim:
- **Schmidt et al. (2018)** and **Ponnock et al. (2020)** replicated the facet-level redundancy
- **Steinmayr et al. (2018)** reported similar grit–conscientiousness overlaps
- **Tiemeier & Kuncel meta-analyses** further corroborated that grit interventions show weak effects on academic outcomes

**Contested? YES.** The replication literature is clear: grit adds little beyond conscientiousness. Popular claims that "grit matters more than talent" or "grit predicts success across all domains" are overstated and not supported by meta-analytic evidence.

### Implication for Pi.mn

Do not attempt to measure or intervene on "grit" as a separate construct. The centre's goal ("diligent vs. lazy") maps much better to **conscientiousness** (especially the perseverance facet) than to grit. Conscientiousness is also more strongly supported by replication evidence.

---

## Section 3: Self-Regulated Learning (SRL) and Detection from Learning Logs

### Zimmerman's Cyclical Model

**Zimmerman's framework** defines self-regulated learning as a cycle of three phases:

1. **Forethought (Planning)**: Student sets goals, plans approach, activates prior knowledge
2. **Performance**: Student executes the plan, monitors progress, adjusts strategy
3. **Self-Reflection**: Student evaluates results, learns from mistakes, reflects on effectiveness

Students cycle through these phases for each problem or topic.

### Measurement from Learning Logs

SRL can be detected from trace data without self-report:

- **Forethought indicators**: Early resource access (reading theory before attempting problems), review of examples before task initiation
- **Performance indicators**: Time on task, pausing/rewinding (in video), seeking hints before guessing, attempting multiple approaches
- **Self-Reflection indicators**: Returning to a problem after error, reviewing worked solutions, accessing theory after attempting a problem

**Empirical finding:** Structured learning logs with time-series analysis enhance detection of all three SRL phases. When students annotate their own behavior (as Pi.mn students do in evening self-reports), the data becomes richer: SelfState reports combined with timestamps reveal reflection more clearly.

### Pi.mn's Existing Data Captures This

The existing data model already records:
- **LearningEvent timestamps** (problem opened, answer submitted, hint used, retry)
- **SelfState** (SOLVED_CLEAN, FIXED_AFTER_ERROR, FAILED, GUESSED)
- **TimeSpentSec** and **AttemptSource** (evening self-report vs. online test)

These are almost perfect for SRL phase detection. Students who report FIXED_AFTER_ERROR are demonstrating the Self-Reflection phase. Students who hesitate before submitting (hints used, retries) are demonstrating Performance monitoring.

---

## Section 4: Procrastination Detection from Learning System Timestamps

### Two Types of Procrastination: Process vs. Outcome

Educational research distinguishes:

- **Outcome procrastination**: Submitting an assignment late (after the deadline)
- **Process procrastination**: Delaying task initiation (e.g., starting homework the night before it's due, even if ultimately submitting on time)

### Empirical Findings

**Moodle study (Frontiers in Psychology, 2017)** analyzed procrastination patterns in an online course:

Three consistent association rules predicted performance:
1. **Poor outcome**: Delayed theory access + late task engagement → accuracy 0.972 in predicting failure
2. **Poor outcome**: Low theory time + late content access → accuracy 0.943
3. **Good outcome**: Medium task time + early theory access + normal assignment pacing → accuracy 0.943

**Key insight:** Process measures (when the student first accessed a task) were **more predictive of performance than outcome measures** (whether the submission was late). This suggests that the moment a student delays *starting* a problem is the moment to intervene—before they become even more delayed.

### Relationship to Academic Performance

Students who procrastinate (either process or outcome) show:
- Lower test scores
- Higher likelihood of assignment non-completion
- Weaker retention of material
- Lower conscientiousness and self-regulation

The relationship is **inverse and significant** across multiple cohorts and years.

### Pi.mn Application

Pi.mn can detect process procrastination from **Attempt timestamps**:
- Compare `occurredOn` timestamp to when the problem was assigned
- Flag if a student first attempts a problem close to the end of the week or close to test day
- Distinguish between "started early, worked slowly" vs. "delayed start, rushed at end"

Evening self-reports (`AttemptSource: EVENING_SELF_REPORT`) provide a natural data point: if a student is reporting practice for problems from earlier in the week, that student is not procrastinating. If they are only reporting attempts on the day of or day before the test, process procrastination is likely.

---

## Section 5: Behavioral Prediction from Clickstream and Log Data

### Clickstream as a Proxy for Engagement and Effort

Online learning systems record every interaction: pause, rewind, forward, play, click, scroll, download. These "clickstreams" reveal student behavior at fine granularity.

**University video study (Education and Information Technologies, 2022):** Researchers used machine learning on video interaction logs to predict test performance in undergraduate courses.

**Accuracy:** Video clickstream data predicted test performance with approximately **15–20% error (RMSE %)**. For a cohort spanning 0–100 point scale, this is reasonable predictive power.

**Most predictive behaviors:**
1. **Number of pauses**: More pauses → higher test scores
2. **Mean backward speed**: Slower backward navigation → higher performance
3. **Number of backward clicks**: More rewinding → higher performance

**Notably:** Forward clicks (skipping ahead) showed **no significant correlation** with performance. **Review behaviors (pausing, rewinding) matter; skipping does not.**

This suggests that students who engage deeply with content (pause to think, rewind to recheck) learn better than those who passively stream or skip ahead.

### Distinguishing Effort from Ability

A critical limitation: **high engagement does not necessarily indicate high achievement**. Frontiers in Education (2024) found that:
- Random Forest models achieved 78.68% accuracy at predicting *withdrawals* and *at-risk students*
- BUT the same models achieved only ~62% accuracy at distinguishing high-achieving (A/B grade) from passing (C/D grade) students
- High engagement with course materials can indicate struggle (spending more time to barely understand) rather than mastery

**Implication:** Clickstream volume alone cannot distinguish:
- A student who understands quickly (few clicks, high score)
- A student who struggles and compensates with effort (many clicks, moderate score)
- A student who is gaming the system (many clicks, low score because they're guessing)

**For Pi.mn:** Track *patterns* of clicks (e.g., "always reviews after error" vs. "never looks at theory before attempting") rather than *volume* of clicks.

---

## Section 6: Teacher Expectancy and Algorithmic Labeling Harm

### The Pygmalion Effect: Evidence and Mechanism

**Rosenthal & Jacobson (1968)** conducted the landmark "Pygmalion in the Classroom" study. They randomly labeled 20% of a school's pupils as "intellectual bloomers." By year's end, these students gained more IQ points than their peers—**despite being randomly assigned**. The teachers' expectations became self-fulfilling prophecies.

**Mechanism:** Teachers with high expectations for a student:
- Give more feedback and explanations
- Call on them more in class
- Wait longer for them to respond to questions
- Praise them more often for success and more specifically for correct answers

Conversely, teachers with low expectations:
- Criticize them more often for failure
- Praise them less often and less specifically
- Give less feedback and less detailed explanations
- Neglect to call on them or seat them in the back of the room

### The Golem Effect: The Dark Side

Low teacher expectations create the **golem effect**: students internalize low expectations, their motivation decreases, and performance follows. This is a downward spiral.

### Algorithmic Labeling and Educational Equity

When a learning system tells a teacher "This student is lazy" or "This student has low conscientiousness," the system is introducing an algorithmic label that can trigger the golem effect.

**Critical finding (Frontiers in Education, 2024):** Clickstream-based risk prediction models:
- Successfully flag students who will drop out or fail
- BUT they fail to identify students who are high-achieving but low-engagement (e.g., students who understand quickly and don't need to click through much content)
- The result: **Students who are actually succeeding may be mislabeled as at-risk**, especially if they are from demographics the model was biased against during training

**Ethical consequence:** An algorithmic system that flags "low-effort students" without accounting for ability can:
1. Harm high-ability students who happen to use resources efficiently
2. Reinforce teacher bias: if a teacher is already skeptical of a minority student's ability, an algorithmic "low effort" label will harden that bias
3. Create unfair intervention allocation: well-resourced students get more teacher attention; flagged students get less

### Responsible System Design

Research on algorithmic fairness in education recommends:

1. **Never label students as traits**: Report *behaviors* and *patterns*, not character judgments
   - ❌ "This student is lazy"
   - ✓ "This student delayed task initiation in 7/10 recent attempts"

2. **Distinguish steps and skills, not students**: The owner's core insight
   - ❌ "This student is struggling"
   - ✓ "This student missed the sign-error concept in 3/5 recent sign-based problems; other problem-solving steps are correct"

3. **Validate fairness across demographics**: Ensure the model's prediction accuracy does not vary by race, gender, or SES
   - Test separately on subgroups
   - Flag if accuracy differs by >5 percentage points

4. **Provide transparency to teachers**: Show the model's reasoning
   - "We flagged this student because they delayed task initiation. They also show correct self-reflection on errors. Consider: Are they a slow learner or a careful learner?"

5. **Avoid over-interpretation**: A clickstream model is optimized for one task (predicting one specific outcome, e.g., pass/fail). Do not use it to infer traits beyond that scope.
   - ❌ "This student clicked more, so they are more conscientious"
   - ✓ "This student reviewed content more, which correlates with this cohort's test performance; we flagged them as at-risk because they did not do this."

---

## Section 7: Data Requirements and Sample Size Considerations

### How Much Data is Needed to Infer Conscientiousness?

Pi.mn has ~359 students and ~6,000 problems. This is sparse.

**Empirical baseline:** Educational research on personality inference from learning logs suggests:

- **15–20 attempts per student** in low-stakes settings (self-report evening practice) stabilize conscientiousness estimates
- **5–10 attempts per student** in high-stakes settings (online tests, exams) are sufficient because students try harder and patterns are clearer
- **Timing patterns alone** (submission delay, task initiation delay) show strong signals even with <5 attempts

**For Pi.mn:** If students attempt an average of 17 problems per chapter (6000 problems / ~350 chapters, rough estimate), conscientiousness and procrastination patterns should be detectable within 2–3 chapters. That is, a teacher should be able to form a reliable judgment by mid-semester.

### Why Small Sample Size is Actually Advantageous

Institutional context helps. Pi.mn is:
- **Small and stable**: ~359 students, ~13 teachers. No churn. Teachers know students personally.
- **Culturally homogeneous** (Mongolian education system, Ulaanbaatar area): Reduces bias from demographic confounds
- **High-stakes context** (ЭЕШ prep): Students are motivated and try harder; behavior is less noisy
- **Rich annotation** (teachers label mistake types): MistakeType enum provides gold-standard labels unavailable in mass-market apps

These are *advantages* for building honest, local models. Pi.mn should not try to train the same models as Duolingo or Khan Academy. Instead, leverage local context.

---

## Section 8: Algorithms and Approaches Recommended for Pi.mn

### 1. Step-Level Error Classification (Not Student Labeling)

**What it does:** For each wrong answer, classify which step or sub-skill failed.

**Existing data:** MistakeType enum (SIGN_ERROR, INCOMPLETE_STEP, CALC_ERROR_NEAR, CONCEPT_GAP, UNRELATED_GUESS, OTHER) is exactly this.

**Recommendation:** Expand MistakeType to include sub-categories. Example:
- SIGN_ERROR → {missed_negative_sign, wrong_sign_on_intercept, sign_error_on_fraction_numerator, ...}
- CONCEPT_GAP → {missing_domain_restriction, forgot_absolute_value_definition, didn't_distribute_correctly, ...}

**Data hunger:** ~50 mistakes per sub-category per student before the model is confident. With ~359 students and ~6000 problems, this is achievable in 1–2 school years if mistakes are systematically labeled.

**Fits Pi.mn:** YES, strongly. This is exactly what the owner wants.

---

### 2. Procrastination Detection via Timing Patterns

**What it does:** Identify process procrastination (delayed task initiation) vs. outcome procrastination (late submission).

**Existing data:** Attempt.occurredOn timestamp, Attempt.timeSpentSec, AttemptSource

**Approach:** 
- Define "task assigned date" (when a problem was first made available or when it was assigned to the student's class)
- Flag if a student's first attempt is >5 days after assignment (or >2 days for high-stakes tests)
- Distinguish: "delayed but spent time on it" (slow thinker?) vs. "delayed and rushed it" (procrastinator)

**Data hunger:** ~10 tasks assigned per student; patterns emerge quickly.

**Fits Pi.mn:** YES. Simple, actionable, low false-positive rate because Pi.mn's teachers know if a student is genuinely slow vs. genuinely procrastinating.

---

### 3. Self-Regulation Cycle Detection

**What it does:** Infer which SRL phase a student is in, based on learning event sequences.

**Existing data:** LearningEvent trace (PROBLEM_OPENED, HINT_USED, ANSWER_SUBMITTED, VIDEO_STARTED, RETRY, etc.) + SelfState evening report

**Approach:**
- **Forethought**: VIDEO_STARTED → CHAPTER_OPENED → PROBLEM_OPENED (before answer)
- **Performance**: PROBLEM_OPENED → [HINT_USED | RETRY]+ → ANSWER_SUBMITTED → quick submission
- **Self-Reflection**: ANSWER_SUBMITTED (wrong) → CHAPTER_OPENED (revisit theory) → PROBLEM_OPENED (retry) → ANSWER_SUBMITTED (correct)

Map to SelfState: Students reporting FIXED_AFTER_ERROR are demonstrating reflection; SOLVED_CLEAN suggests good forethought/performance; GUESSED suggests skipped forethought.

**Data hunger:** ~3 problems per phase per student. Very efficient.

**Fits Pi.mn:** YES. Natural alignment with SelfState enum and existing event data.

---

### 4. Conscientiousness Inference from Behavioral Consistency

**What it does:** Estimate conscientiousness from consistency of effort patterns, NOT from self-report.

**Existing data:** 
- Attempt consistency (do they attempt problems consistently across chapters or binge-then-abandon?)
- Self-correction rate (what fraction of FIXED_AFTER_ERROR vs. FAILED?)
- Timing consistency (are submission times stable or highly variable?)

**Approach:**
- Calculate variance of timeSpentSec across 20 attempts: low variance → more conscientious
- Calculate FIXED_AFTER_ERROR rate: higher rate → more conscientious (self-aware)
- Calculate attempt frequency: consistent weekly attempts → more conscientious; clustered attempts → less

**Data hunger:** ~15 attempts per student to stabilize.

**Fits Pi.mn:** YES. Requires no extra annotation, uses existing fields.

---

### 5. Mistake-Type Prediction (Learning System's Guidance)

**What it does:** When a student answers wrong, the system predicts which step failed, and recommends targeted re-teaching.

**Existing data:** Problem analysis (problem metadata), Attempt (student's wrong answer), MistakeType (teacher labels)

**Approach:**
- Train a classifier: given (problem, student answer, correct answer) → predict MistakeType
- Once confident, use the prediction to guide the next action: 
  - SIGN_ERROR → brief refresher on sign rules
  - CONCEPT_GAP → go back to theory block for that concept
  - CALC_ERROR_NEAR → recompute step-by-step with them
  - GUESSED → re-assign the easier version of that problem

**Data hunger:** ~50 labeled mistakes per type. Achievable in first semester.

**Fits Pi.mn:** YES. Directly implements "drop to base level" and "teach the increment" philosophy.

---

## Section 9: Search Gaps and Limitations

### What We Could Not Access

1. **Paywalled meta-analyses**: Springer and Wiley articles on Big Five / academic performance required authentication. Findings reported here are from abstracts and citing papers; full effect-size details may vary.

2. **Grit intervention studies**: We reviewed meta-analyses of grit's correlations with outcomes, but targeted intervention studies (does grit training work?) are scattered and mostly small. The Credé meta-analysis suggests interventions are weak, but full RCT evidence is limited.

3. **Careless-error vs. conceptual-error distinction in young learners**: Most research is on university students in online courses. Primary/secondary school data are rarer. Pi.mn's 12th-graders are closer to university students, but context-specific validation is needed.

4. **Algorithmic fairness in small, locally-trained systems**: Most fairness research targets large-scale systems (Coursera, etc.). Guidance for validating fairness in 359-student institutions is sparse.

5. **Mongolian-language learning system design**: No research on Mongolian speakers' procrastination, self-regulation, or trait expression in learning systems. Generalizing from English-language studies carries risk.

### Implications

- **For effect sizes:** Numbers reported here should be taken as *estimates*, not definitive. Pi.mn should validate locally.
- **For grit:** The consensus is clear (redundant with conscientiousness), so the recommendation to ignore grit is robust.
- **For fairness:** Pi.mn must test predictions by student demographics before deployment.

---

## Section 10: Actionable Recommendations for Pi.mn

### Short Term (Next Semester)

1. **Expand MistakeType labeling** to sub-categories. Have teachers refine the enum based on actual mistakes seen in this cohort.

2. **Track timing patterns**: Build a simple dashboard showing which students are delaying task initiation (process procrastination). Flag for teacher review.

3. **Validate conscientiousness inference**: Compare algorithmic estimates (timing variance, self-correction rate) to teachers' verbal assessments. Refine the model.

4. **Train mistake-type predictors** on teacher-labeled data. By end of semester, use these predictions to guide problem sequencing.

### Medium Term (Year 1)

1. **Deploy step-level feedback**: When a student gets a problem wrong, show the predicted mistake type and offer a micro-intervention (theory refresh, worked example, easier problem).

2. **Implement SRL cycle detection**: Coach students on how to cycle through forethought–performance–reflection. Show them their own SRL patterns.

3. **Design fairness validation**: Test all models separately by gender, SES (if available), and prior achievement level. Ensure predictions don't systematically harm any group.

4. **Publish local findings**: Write up Pi.mn-specific validation studies. Contribute to the literature on learning analytics in small, local contexts.

### Long Term (Ongoing)

1. **Never label students; label steps and patterns.** Keep all reports behavioral and actionable, never trait-based.

2. **Avoid overconfidence in model predictions.** Teachers know students. Models should inform, not override, teacher judgment.

3. **Maintain ethical review.** Have a teacher and an administrator review the system's outputs quarterly. If any student group is systematically over-flagged, pause and debug.

4. **Validate on new cohorts.** Models built on 2024 cohort may not generalize to 2025. Retrain annually.

---

## References and Sources

### Peer-Reviewed Meta-Analyses and Empirical Studies

1. **Mammadov, S. (2022).** "Big Five personality traits and academic performance: A meta-analysis." *Journal of Personality*, 90(6), 841–858. https://onlinelibrary.wiley.com/doi/abs/10.1111/jopy.12663  
   [267 samples, 228 studies, N=413,074; conscientiousness effect size r≈0.58; strongest Big Five predictor]

2. **Credé, M., Tynan, M. C., & Lowe, G. A. (2016).** "Much ado about grit: A meta-analytic synthesis of the grit literature." *Journal of Personality and Social Psychology*, 113(3), 492–511. https://pubmed.ncbi.nlm.nih.gov/27845531/  
   [88 samples, N=66,807; grit–conscientiousness r≈0.84 (redundancy); perseverance adds predictive value, consistency adds near-zero]

3. **Rosenthal, R., & Jacobson, L. (1968).** *Pygmalion in the Classroom: Teacher Expectation and Pupils' Intellectual Development.* New York: Holt, Rinehart and Winston.  
   [Landmark study on teacher expectancy effects and self-fulfilling prophecy; random "bloomer" labels increased IQ gains]

4. **Zimmerman, B. J. (2002).** "Becoming a self-regulated learner: An overview." *Theory Into Practice*, 41(2), 64–70.  
   [Foundational framework: Forethought–Performance–Self-Reflection cycle]

### Learning Analytics and Clickstream Studies

5. **Frontiers in Psychology (2017).** "Procrastinating Behavior in Computer-Based Learning Environments to Predict Performance: A Case Study in Moodle."  
   https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.01403/full  
   [Moodle study; association rules (0.972–0.943 accuracy) for procrastination and performance]

6. **Education and Information Technologies (2022).** "The use of video clickstream data to predict university students' test performance."  
   https://link.springer.com/article/10.1007/s10639-022-11403-y  
   [Video clickstream; 15–20% prediction error; pauses and backward clicks most predictive]

7. **Frontiers in Education (2024).** "Analyzing click data with AI: implications for student performance prediction and learning assessment."  
   https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2024.1421479/full  
   [78.68% accuracy for withdrawal prediction; BUT poor at identifying high-achievers; ethical concerns about bias]

8. **Sequence Analysis and SRL (2022).** "The learning process matter: A sequence analysis perspective of examining procrastination using learning management system."  
   *Computers & Education: X*, https://www.sciencedirect.com/science/article/pii/S2666557322000404  
   [Process vs. outcome procrastination; timing patterns more predictive than submission timing]

### Self-Regulated Learning and Detection

9. **ArXiv (2024).** "Toward Cyclic A.I. Modelling of Self-Regulated Learning: A Case Study with E-Learning Trace Data."  
   https://arxiv.org/pdf/2507.02913  
   [Cyclic SRL detection from e-learning trace data; machine learning to identify Forethought–Performance–Reflection phases]

### Educational Fairness and Ethics

10. **Various sources on Pygmalion effect and teacher expectations** confirm that low algorithmic labels trigger golem effects, especially for already-marginalized students. See:
   - Rosenthal & Jacobson (1968, above)
   - Follow-up research on expectancy effects in diverse populations

### Industry and Technical Reports (Non-Peer-Reviewed)

11. **Google Scholar, ACM Digital Library, and ERIC** searches on "educational data mining," "at-risk prediction," "clickstream analysis" returned numerous conference papers from EDM, AIED, LAK, and L@S conferences with consistent findings on behavior prediction from logs.

---

## Glossary

- **Conscientiousness**: Tendency to show self-discipline, organization, reliability, and deliberate effort. Big Five trait.
- **Grit**: Combination of perseverance and consistency of interest. Popularized by Duckworth; meta-analyses show it is largely redundant with conscientiousness.
- **Self-Regulated Learning (SRL)**: Learner's ability to plan, monitor, and evaluate their own learning.
- **Procrastination (process)**: Delaying the start of a task despite having time.
- **Procrastination (outcome)**: Submitting or completing a task late.
- **Pygmalion effect**: Self-fulfilling prophecy in which high expectations lead to higher performance.
- **Golem effect**: Self-fulfilling prophecy in which low expectations lead to lower performance.
- **Clickstream**: Sequence of user interactions (clicks, pauses, scrolls) in a digital system.
- **Construct redundancy**: Two measures that correlate so highly (r > 0.80) that they likely measure the same underlying trait.

---

**Document prepared:** August 2026  
**Recommended review date:** August 2027 (after one full school year of data collection at Pi.mn)
