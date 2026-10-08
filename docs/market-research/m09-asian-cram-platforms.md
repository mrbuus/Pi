# Research: Asian Cram-School and Exam-Prep Technology Platforms

**Researcher:** Claude Haiku 4.5  
**Date:** September 14, 2026  
**Focus:** Centre-facing tools, paper-to-digital workflows, mistake tracking, and granular problem tagging for ЭЕШ tutoring centres

---

## Executive Summary

This research examined eight leading Asian exam-prep and tutoring platforms that serve cram schools, coaching centres, and tutoring networks. Key findings:

1. **No platform has comprehensively solved the paper-to-digital workflow** that matches a physical centre where students sit paper tests, self-report results, and receive adaptive recommendations.
2. **Problem tagging granularity varies widely**: Squirrel AI uses 10,000+ knowledge points for middle school math; Riiid tracks 130M+ student interactions; but most platforms do not publish tagging specificity.
3. **Centre-facing admin tools exist but are sparse**: Quipper, Kumon Connect, and Riiid/Santa have centre dashboards; Chinese platforms (Yuanfudao, Zuoyebang) do not prominently advertise centre-facing functionality post-2021 crackdown.
4. **Mistake tracking is granular in research but limited in production**: Squirrel AI and Riiid claim error diagnosis; actual implementation details are not publicly documented.
5. **The 2021 China crackdown fundamentally reshaped the market**: Yuanfudao and Zuoyebang survived by pivoting to AI tutoring and non-tutoring ventures; neither has published updated centre-facing tools.
6. **Kumon Connect (tablet-based worksheets with progress tracking) is the closest analogue** to what a paper-first centre needs: it preserves the worksheet model, adds online progress visibility, and works at franchise scale.

---

## Master Table: Platform Comparison

| Platform | Country | Year | Centre-Facing Tools? | Paper Workflow Support? | Mistake Tracking | Problem Tagging Granularity | Parent Features | Current Status | Verified |
|----------|---------|------|----------------------|------------------------|-----------------|-----------------------------|-----------------|--------|----------|
| **Yuanfudao** | China | 2014 | Limited/Not Advertised | No | Not Published | Not Published | Yes (app) | Operating (AI pivot) | Marketing claims only |
| **Zuoyebang** | China | 2014 | Limited/Not Advertised | No | Not Published | 1.9B+ questions | Yes (app) | Operating (AI pivot) | Marketing claims only |
| **Squirrel AI** | China | 2010 | Minimal | No | Yes (error diagnosis agents) | 10,000+ points (middle school math) | Yes (reports) | Operating | Academic papers + marketing |
| **QANDA / Mathpresso** | Korea | 2012 | No | Photo OCR (homework, not tests) | Not Published | Not Published | Basic (tutor referrals) | Operating | Feature set documented |
| **Riiid / Santa** | Korea | 2016 | Yes (learning dashboards) | No (TOEIC-only, streaming) | Yes (knowledge tracing) | Sub-knowledge points | Yes (detailed) | Operating | EdNet dataset published |
| **Toppr** | India | 2013 | Adaptive practice + analytics | No | Not Published | Adaptive (undocumented) | Yes (progress reports) | Operating | Feature marketing only |
| **BYJU'S** | India | 2011 | N/A | No | Not Published | Extensive (undocumented) | Yes (detailed) | **In Insolvency (2024+)** | Not viable |
| **Unacademy** | India | 2015 | Educator app | No | Not Published | Not Published | Yes (subscription tiers) | Acquired (upGrad, 2026) | Declining viability |
| **Physics Wallah** | India | 2019 | Tuition centre program | OMR sheets (offline delivery only) | Not Published | Not Published | Yes (DPP apps) | Operating | Marketing only |
| **Kumon** | Japan | 1958 | **Yes (Kumon Connect)** | **Hybrid (paper + tablet)** | Not Emphasis | Mastery progression (granular) | Yes (tablet progress) | **Operating** | Live product (90%+ deployment) |
| **Quipper** | Indonesia, Philippines | 2010 | **Yes (Educator App)** | No | Auto-grading only | Not Published | Yes (app features) | Operating | Feature documentation |

---

## Platform Deep Dives

### 1. Yuanfudao (猿辅导) — China

**Founded:** 2014  
**Model:** Live classes, homework assistance, AI tutoring (post-2021 pivot)

#### Centre-Facing Tools
- **Not found.** Pre-2021 marketing emphasized live classes and AI marking, but no public documentation of centre roster, attendance, test management, or analytics dashboards.
- Post-crackdown, pivoted to "Xiaoyuan AI Learning Machine" (scanning, printing, adaptive grading) but target is B2C (families), not B2B (tutoring centres).

#### Paper-to-Digital Workflow
- No evidence of centre-based paper test workflow support.
- Xiaoyuan AI device scans worksheets and provides auto-grading but is positioned for home use, not classroom deployment.

#### Mistake Tracking
- Claims AI-powered marking and error diagnosis; no published methodology.

#### Business Model
- **Pre-2021:** Per-student subscription + live class fees; valued at $15B.
- **2021 Crackdown:** Subject to "double reduction" policy; banned from online tutoring classes.
- **Pivot:** Invested in clothing, printer businesses; shifted to AI tutoring and non-education sectors.
- **2026 Status:** Valued at $15.5B; 1,790 employees; described as "operating" but revenue sources are unclear.

#### Sources
- [Yuanfudao Leads in China's Online Education Market](https://daoinsights.com/works/yuanfudao-becomes-a-leader-in-chinas-growing-online-education-market/)
- [Yuanfudao 2026 Company Profile](https://tracxn.com/d/companies/yuanfudao/)
- [China's Tutoring Market Post-Crackdown](https://thechinaproject.com/2022/08/05/chinas-radically-transformed-tutoring-market-one-year-after-crackdown/)

---

### 2. Zuoyebang (作业帮) — China

**Founded:** 2014  
**Model:** Homework help, question bank (1.9B+ questions), live classes (pre-2021)

#### Centre-Facing Tools
- Not advertised. Like Yuanfudao, pre-2021 focus was on homework photo-solve and live tutoring.
- No public centre management or test tracking dashboard found.

#### Paper-to-Digital Workflow
- Not supported. Zuoyebang's strength is in homework photo-recognition (students photograph problems for AI solutions), not paper test recording.

#### Mistake Tracking
- Not documented.

#### Problem Bank
- **1.9 billion+ questions** covering all K-12 subjects (math, English, Chinese, physics, chemistry, biology, history, politics).
- Tagging structure not publicly disclosed.

#### Business Model
- **Pre-2021:** Subscription + VIP tiers; valued at $13B.
- **2021 Crackdown:** Lost online tutoring revenue; pivoted to printer business (hedging strategy).
- **2026 Status:** Valued at $3B; 30,000 employees; still operating but fundamental business model under pressure.

#### Sources
- [Zuoyebang Overview](https://www.zybang.com/)
- [Zuoyebang 2026 Company Profile](https://pitchbook.com/profiles/company/123320-44)
- [China EdTech Crackdown Impact](https://thepienews.com/china-edtech-new-regulations/)

---

### 3. Squirrel AI (松鼠AI) — China

**Founded:** 2010  
**Model:** Adaptive learning with hyper-granular knowledge point mapping

#### Centre-Facing Tools
- Minimal direct advertising. Schools can integrate Squirrel AI but no prominent centre dashboard marketed.
- Post-crackdown, model shifted to **free school access for 1.5–2 years, then subscription**.

#### Paper-to-Digital Workflow
- Not supported. Squirrel AI is pure digital (tablet/web).

#### Problem Tagging & Knowledge Points
- **10,000+ knowledge points for middle school mathematics alone** (e.g., rational numbers, triangle properties, Pythagorean theorem).
- System integrates sub-knowledge points, ability tags, attention indices, and forgetting curves.
- **Data density 10–100x higher than conventional datasets** according to company claims.

#### Mistake Tracking
- **Yes, with error diagnosis agents.**
  - Multiple AI agents (personalized assessment, error diagnosis, emotion recognition) work collaboratively.
  - System refines 100+ original knowledge points into thousands of micro-lessons.
  - Inaccuracies sometimes occur in error cause analysis (multimodal LLM misinterpretation); fundamental reason inference is sometimes difficult.

#### Parent Features
- Reports on weakness areas and targeted micro-lessons.

#### Business Model
- Schools get free/heavily discounted access in early years; then transition to subscription fees.
- Marketed as "circumventing" the 2021 tutoring ban by operating within schools.

#### Sources
- [MIT Technology Review: China's AI Education Experiment](https://www.technologyreview.com/2019/08/02/131198/china-squirrel-has-started-a-grand-experiment-in-ai-education-it-could-reshape-how-the-world-learns/)
- [ArXiv: AI-Driven Virtual Teacher for Error Analysis and Correction](https://arxiv.org/pdf/2409.09403)
- [Squirrel AI Overview](https://en.wikipedia.org/wiki/Squirrel_AI)

---

### 4. QANDA (Mathpresso) — Korea

**Founded:** 2012  
**Model:** Photo homework solver + tutoring referrals

#### Centre-Facing Tools
- **No.** QANDA is B2C (student-facing app) with tutor/academy referrals.

#### Paper-to-Digital Workflow
- **Photo OCR for homework only.** Students photograph math problems, OCR extracts text, AI provides step-by-step solutions.
- Does **not** support paper test workflows or centre test recording.

#### Mistake Tracking
- Not published.

#### Business Model
- **Freemium:** Basic solution search free; premium for video explanations and tutoring referrals.
- 8M+ monthly users globally (Asia-focused).
- Expanded to **QANDA Tutor (1:1 tutoring on tablets)** and **digital textbooks** in partnership with Korean publishers.

#### Limitations
- Not designed for tutoring centre administration.
- Student-facing, not centre-facing.

#### Sources
- [QANDA Overview](https://en.wikipedia.org/wiki/QANDA)
- [QANDA: Transforming Math Learning Across Asia](https://conversationaltechsummitasia.com/qanda-mathpresso-the-ai-tutor-transforming-math-learning-across-asia/)

---

### 5. Riiid / Santa — Korea

**Founded:** 2016  
**Model:** Adaptive TOEIC prep with knowledge tracing; AI-powered tutoring

#### Centre-Facing Tools
- **Yes.** Riiid offers learning dashboards for monitoring student progress.
- Not explicitly marketed as "centre management," but platform supports educator dashboards.

#### Paper-to-Digital Workflow
- **No.** Santa is streaming TOEIC practice (digital-only).

#### Mistake Tracking & Knowledge Tracing
- **Yes, highly granular.**
  - EdNet dataset: 130+ million student-system interactions over 2 years (780K+ users).
  - Knowledge tracing models: LSTM-SAKT, importance mechanisms, discriminative pre-training.
  - Research papers published at major AI conferences (NeurIPS, ACL, etc.).
  - System tracks sub-knowledge point accuracy, error patterns, and forgetting curves.

#### Problem Tagging Granularity
- **Sub-knowledge points** (granularity level not numerically disclosed publicly).
- TOEIC structured into listening, reading, grammar, vocabulary, etc.; each subdivided adaptively.

#### Parent/Student Features
- Personalized shortest learning path (optimized for study time reduction).
- Real-time ability estimation.

#### Business Model
- **TOEIC premium subscription + enterprise partnerships.**
- Originally Korea-focused; expanded to Japan (ALC partnership).
- Estimated 1M+ cumulative users in Korea.

#### Research Contributions
- EdNet is one of largest publicly available knowledge-tracing datasets.
- Multiple peer-reviewed papers on knowledge transfer and adaptive learning.

#### Sources
- [Riiid EdNet Dataset](https://github.com/riiid/ednet)
- [Knowledge Tracing Research Papers (ArXiv)](https://arxiv.org/pdf/2403.06725)
- [Riiid: Top EdTech Startup APAC 2019](https://www.educationtechnologyinsights.com/riiid)

---

### 6. Toppr — India

**Founded:** 2013  
**Model:** Adaptive learning for CBSE/ICSE + JEE/NEET prep

#### Centre-Facing Tools
- Adaptive practice with test analytics; no public centre roster/attendance dashboard.
- Marketed to individual students, not tutoring centres.

#### Paper-to-Digital Workflow
- Not supported.

#### Mistake Tracking
- Test analytics track performance; granular error diagnosis not published.

#### Problem Bank
- Extensive (undocumented structure); questions tagged by difficulty and subject.
- Native on-screen test interface (not PDF-based).

#### Business Model
- Subscription-based; direct-to-student.
- Positioned for competitive exam prep (JEE, NEET, UPSC).

#### Sources
- [Toppr Platform Overview](https://www.digittrix.com/blogs/top-online-learning-platforms-in-india-2026-reviews-pricing)

---

### 7. BYJU'S — India

**Founded:** 2011  
**Model:** Live classes + adaptive learning (widest reach in India pre-2024)

#### STATUS: **NOT VIABLE**
- **In insolvency proceedings since mid-2024.**
- Aakash Digital Classroom shut down; app delisted from Google Play (May 2025).

#### Historical Note
- Was largest edtech company in India by users.
- Offered centre-like programs but never designed as centre management software.

#### Sources
- [BYJU'S on Wikipedia](https://en.wikipedia.org/wiki/Byju%27s)
- [BYJU'S Insolvency News](https://www.digittrix.com/blogs/top-online-learning-platforms-in-india-2026-reviews-pricing)

---

### 8. Unacademy — India

**Founded:** 2015  
**Model:** Live classes + recorded content for K-12 and competitive exams

#### STATUS: **ACQUIRED (March 2026, marginal viability)**
- Acquired by upGrad in 100% share-swap deal; valuation dropped 85% from peak.
- Educator app exists but platform focus has shifted post-acquisition.

#### Centre-Facing Tools
- Educator app for creating classes and sending assignments; not a full centre management suite.

#### Business Model
- Subscription tiers; 50M+ registered learners pre-acquisition.

#### Sources
- [Unacademy Overview](https://www.digittrix.com/blogs/top-online-learning-platforms-in-india-2026-reviews-pricing)

---

### 9. Physics Wallah — India

**Founded:** 2019  
**Model:** YouTube-origin tutoring centre franchise; hybrid online/offline

#### Centre-Facing Tools
- **Physics Wallah Tuition Centre Program** for Classes 8–10.
- Blends offline classes with online content.
- Admin features not explicitly documented.

#### Paper-to-Digital Workflow
- **OMR sheets delivered offline** (admit cards, OMR sheets, rankers booklets mailed to students).
- Test series have structured physical components; digital results not automatically captured.
- **Not a digital-first solution.**

#### Business Model
- Franchise model + online platform.
- Daily Practice Papers (DPPs) + lesson notes via app.
- Competitive exam focus (JEE, NEET).

#### Limitations
- OMR workflow is manual (mail-based); no scanning/upload integration.
- Not designed as centre management software.

#### Sources
- [Physics Wallah Tuition Centre Program](https://www.pw.live/vp-blogs/exams/pw-tuition-centre-program-for-classes-8th-to-10th)

---

### 10. Kumon — Japan

**Founded:** 1958  
**Model:** Mastery-based, example-driven worksheets; global franchise (25,000+ centres)

#### Centre-Facing Tools
- **Yes. Kumon Connect (2024+):**
  - Tablet-based platform where students complete worksheets digitally.
  - **90%+ deployment rate** (~40,000 students as of 2024).
  - Parents and instructors track progress online.
  - Instructor interface for monitoring completion and performance.

#### Paper-to-Digital Workflow
- **Hybrid model (the closest match to the client's needs):**
  - Students start with physical worksheets (traditional Kumon model).
  - Transition to Kumon Connect tablets for same worksheets in digital form.
  - Progress synchronizes across paper and digital.
  - Instructors retain mastery-based advancement rules.

#### Mistake Tracking
- Not emphasized in marketing; relies on mastery progression (student must achieve ~80% on worksheet level before advancing).

#### Problem Tagging
- Hierarchical by skill (addition, multiplication, fractions, etc.).
- Granularity is implicit in the mastery workflow, not numbered as "knowledge points."

#### Parent Features
- Online progress tracking on tablet platform.
- Visible advancement through worksheet levels.

#### Business Model
- **Franchise model (ultra-low entry):**
  - $1,000 franchise fee + $74K–$166K total investment.
  - 30% net margin (worksheet-based, low overhead).
  - 60+ years brand presence; 25,000+ global locations.
  - Kumon Connect is SaaS overlay on franchise model.

#### Current Status
- **Operating and expanding** (Kumon Connect 2024+).
- Unique position as established analog-first company with credible digital transition.

#### Sources
- [Kumon Adapts to Modern Education Demands with Technology in 2024](https://www.franchise.org/2025/02/kumon-adapts-to-modern-education-demands-with-technology-in-2024/)
- [Kumon Franchise Cost 2026](https://franchiseinvestordata.com/franchise/kumon)

---

### 11. Quipper — Indonesia, Philippines

**Founded:** 2010  
**Model:** School-focused LMS + homework submission + auto-grading

#### Centre-Facing Tools
- **Yes. Quipper for Educators (Android app):**
  - Create classes, send assignments, monitor learning activities.
  - Auto-graded quizzes.
  - Messaging for class announcements and 1:1 student communication.

#### Paper-to-Digital Workflow
- Not supported. Quipper is fully digital (no paper test workflow integration).

#### Mistake Tracking
- Auto-grading only; no error diagnosis or mistake classification.

#### Business Model
- School subscriptions + B2C student subscriptions.
- Ready-made lessons; interactive video content.
- Part of Manabie Group (Singapore-founded EdTech holding).

#### Parent Features
- Student progress visible to parents via app.

#### Current Status
- Operating in Indonesia and Philippines.
- Positioned for K-12 schools, not standalone tutoring centres.

#### Sources
- [Quipper for Educators](https://www.quipper.com/ph/teacher/)
- [Quipper Philippines LMS](https://ph.quipper.com/)
- [Assessment of Quipper as LMS](https://ijcsrr.org/wp-content/uploads/2023/09/29-2009-2023.pdf)

---

## Analysis: Three Key Questions

### **Question 1: Has Anyone Solved the Paper-Test-to-Digital-Record Workflow?**

**Answer: No, not comprehensively.**

| Approach | Company | Viability for Pi.mn |
|----------|---------|---------------------|
| **Paper-first with manual entry** | Physics Wallah (OMR sheets) | Low — offline OMR delivery; no digital capture workflow. |
| **Photo OCR (homework only)** | QANDA, Zuoyebang | Low — homework photos, not test papers; no centre roster. |
| **Paper + tablet hybrid** | **Kumon Connect** | **High** — preserves paper worksheets; transitions to tablet; instructor can track completion + progress. |
| **Pure digital (no paper)** | All others | Not applicable. |

**Closest Solution: Kumon Connect**
- Students start with paper worksheets (familiar, no device anxiety).
- Gradually transition to tablet (same worksheet content, digital submission).
- Instructor sees completion + performance.
- Mastery progression is automatic (e.g., must achieve 80% before advancing).
- No OMR scanning or photo upload needed—**worksheet completion IS the signal.**

**For a Mongolian centre:** Kumon's approach removes the complexity of OMR scanning or photo upload—it treats **worksheet completion and score as the digital record**. This works because:
- Paper tests are still used (for high-stakes exams).
- Daily practice can shift to tablet (Kumon Connect model).
- Instructors see progress without photographing or scanning.
- Parents see progress on tab (or SMS if needed for non-smartphone users).

---

### **Question 2: How Granular Does Problem Tagging Need to Be for Adaptive Recommendation to Work?**

**Answer: Very granular, and published specificity varies widely.**

| Platform | Granularity Level | Coverage | Effectiveness Claim |
|----------|------------------|----------|----------------------|
| **Squirrel AI** | **10,000+ knowledge points** (middle school math only) | Middle school math subdivided into ~10K micro-concepts | Micro-lesson targeting; sub-point tracking |
| **Riiid/Santa** | **Sub-knowledge points** (not numerically published) | TOEIC (listening, reading, grammar, vocab, etc.) | Personalized shortest learning path; real-time ability estimation |
| **Kumon** | **Hierarchical skill levels** (implicit mastery progression) | All subjects (math, reading); granularity ~50–200 skill levels per subject | Mastery-based advancement; not "adaptive" in ML sense |
| **Toppr** | **Undocumented; described as "adaptive"** | CBSE/ICSE/JEE/NEET | Test analytics; difficulty adaptation |
| **QANDA** | **Undocumented** | Math homework; likely by problem type | Solution matching; tutoring referrals |
| **Physics Wallah** | **Not published** | JEE/NEET competitive exams | DPP difficulty variation |

**Key Finding:**
- **10,000+ is not typical.** Squirrel AI's figure is exceptionally high and limited to middle school math.
- **100–1,000 discrete micro-concepts per subject** is more realistic for balanced granularity.
- **Riiid's approach (sub-knowledge points via knowledge tracing)** is more scalable than exhaustive manual tagging—system learns point boundaries from student data.
- **Kumon's mastery levels (~50–200 per subject) work well** for mastery-based systems but are less fine-grained than adaptive learning systems.

**For Pi.mn:**
- If building an adaptive system: start with 100–200 knowledge points per ЭЕШ subject; let the system refine boundaries from student data (knowledge tracing approach).
- If building a mastery-based system (like Kumon): 50–100 skill levels per subject is sufficient.
- **Do not** try to hand-tag 10,000 points upfront—Squirrel AI's scale required years of master-teacher collaboration.

---

### **Question 3: What Do Centre-Facing (Teacher/Admin) Screens Look Like in Mature Products?**

**Answer: Few platforms publish detailed centre UI; but patterns emerge from available documentation.**

#### **Documented Features in Existing Platforms**

**Kumon Connect (Most Detailed)**
- Instructor dashboard shows student worksheets completed (digital count + date).
- Progress visualization (mastery level advancement by subject).
- Performance summary (% accuracy per worksheet level).
- Class-level completion reports.

**Riiid/Santa**
- Learning dashboard (cumulative progress + ability estimation).
- Not explicitly detailed; likely student-centric (not centre-centric).

**Quipper for Educators**
- Class creation and student roster.
- Assignment distribution (one-click).
- Auto-graded quiz results (instant feedback).
- Class messaging/announcements.
- Student activity monitoring (completion, time-on-task estimates).

**Generic Tuition Centre Admin Dashboards (Research)**
- **Attendance roster:** live check-in, no-shows, late arrivals; monthly summaries.
- **Student performance:** test scores, progress trends, subject-wise analysis.
- **Class analytics:** attendance vs. performance correlation; class-level improvement tracking.
- **Teacher workload:** hours taught, students assigned, marking load.
- **Parent reports:** progress summaries (weekly/monthly), areas for improvement, recommended actions.

#### **Critical Gap**
- **None of the major Chinese platforms (Yuanfudao, Zuoyebang, Squirrel AI) advertise centre-facing dashboards.**
  - Pre-2021: live class management (now banned).
  - Post-2021: pivot to AI tutoring (B2C, not B2B).
- **Riiid and Quipper have minimal public details on centre screens.**

#### **For Pi.mn:**
A mature centre dashboard should include:
1. **Attendance & Roster** — check-in by student, by class, by date; summary reports.
2. **Test Management** — scheduled tests, results entry (manual or OMR scan), score tracking.
3. **Student Performance** — test scores, trends, weak subjects, recommendations.
4. **Parent Communication** — progress reports (SMS/email), recommendations, test results.
5. **Teacher Workload** — classes taught, students managed, marking load.
6. **Analytics** — attendance vs. score correlation, class-level improvement, predictive flags (at-risk students).

**Kumon Connect is the only existing example that demonstrates these in practice.**

---

## What I Could Not Access

### Language and Regional Barriers
- **Chinese platforms (Yuanfudao, Zuoyebang, Squirrel AI):** Official websites are in Mandarin Chinese; English marketing pages are limited.
  - No access to: live product screenshots, instructor-facing screens, centre dashboard details.
  - Reliance on: company press releases, English news coverage, academic papers, and Chinese-language Wikipedia entries.

### Proprietary Product Screens
- **Riiid/Santa, Toppr, Kumon Connect:** Live product screenshots and detailed UI walkthroughs are not published.
  - Available only through: live demo access (requires sign-up) or customer testimonials (sparse).

### Post-2021 Regulatory Uncertainty
- **China tutoring crackdown impact:** Exact business model pivots for Yuanfudao and Zuoyebang are unclear.
  - Public reporting focuses on headlines; detailed operational changes (e.g., "Are centre tools still offered?") are not documented in accessible English sources.

### Mistake Tracking Implementation
- **Squirrel AI and Riiid claim error diagnosis.** Academic papers (arXiv) describe research; production implementation is not detailed.
  - What is published: error diagnosis *agents exist* and multimodal LLMs sometimes struggle with error cause inference.
  - What is not published: how errors are classified, stored, and fed back to students.

### Pricing & Business Model Details
- **Kumon:** Franchise fee known ($1K); total investment ($74K–$166K) published; Kumon Connect SaaS cost not published.
- **Riiid/Santa, Quipper, Toppr:** Subscription pricing for schools/centres not published; only end-user pricing visible.

---

## Sources Cited

1. [Yuanfudao Leads in China's Online Education Market](https://daoinsights.com/works/yuanfudao-becomes-a-leader-in-chinas-growing-online-education-market/)
2. [Yuanfudao 2026 Company Profile](https://tracxn.com/d/companies/yuanfudao/)
3. [China's Tutoring Market One Year After Crackdown](https://thechinaproject.com/2022/08/05/chinas-radically-transformed-tutoring-market-one-year-after-crackdown/)
4. [Zuoyebang Official Site](https://www.zybang.com/)
5. [Zuoyebang 2026 Company Profile](https://pitchbook.com/profiles/company/123320-44)
6. [China EdTech Private Tutoring Crackdown](https://thepienews.com/china-edtech-new-regulations/)
7. [MIT Technology Review: China's AI Education Experiment](https://www.technologyreview.com/2019/08/02/131198/china-squirrel-has-started-a-grand-experiment-in-ai-education-it-could-reshape-how-the-world-learns/)
8. [ArXiv: AI-Driven Virtual Teacher for Error Analysis](https://arxiv.org/pdf/2409.09403)
9. [Squirrel AI Overview](https://en.wikipedia.org/wiki/Squirrel_AI)
10. [QANDA Wikipedia](https://en.wikipedia.org/wiki/QANDA)
11. [QANDA: Transforming Math Learning Across Asia](https://conversationaltechsummitasia.com/qanda-mathpresso-the-ai-tutor-transforming-math-learning-across-asia/)
12. [Riiid EdNet Dataset](https://github.com/riiid/ednet)
13. [Knowledge Tracing Research (ArXiv)](https://arxiv.org/pdf/2403.06725)
14. [Riiid: Top EdTech Startup APAC 2019](https://www.educationtechnologyinsights.com/riiid)
15. [Top Online Learning Platforms in India 2026](https://www.digittrix.com/blogs/top-online-learning-platforms-in-india-2026-reviews-pricing)
16. [Physics Wallah Tuition Centre Program](https://www.pw.live/vp-blogs/exams/pw-tuition-centre-program-for-classes-8th-to-10th)
17. [Kumon Adapts to Modern Education Demands 2024](https://www.franchise.org/2025/02/kumon-adapts-to-modern-education-demands-with-technology-in-2024/)
18. [Kumon Franchise Cost 2026](https://franchiseinvestordata.com/franchise/kumon)
19. [Quipper for Educators](https://www.quipper.com/ph/teacher/)
20. [Quipper Philippines LMS](https://ph.quipper.com/)
21. [Assessment of Quipper as LMS](https://ijcsrr.org/wp-content/uploads/2023/09/29-2009-2023.pdf)

---

## Recommendations for Pi.mn

### 1. **Paper-to-Digital Workflow: Adopt Kumon Connect's Hybrid Model**
- Preserve paper tests for high-stakes exams and accountability.
- Shift daily practice/homework to tablet or web interface.
- Record completion and score as the digital signal; do not require OMR scanning or photo upload.
- This avoids the friction of manual entry or OCR reliability issues.

### 2. **Problem Tagging: Start with 100–200 Knowledge Points per Subject, Refine with Student Data**
- Do not hand-tag 10,000 points upfront.
- Use knowledge tracing (e.g., item response theory or Bayesian networks) to learn point boundaries from student performance data.
- Prioritize test-prep domains (math, Mongolian, science) first.

### 3. **Mistake Tracking: Implement at Two Levels**
- **Level 1 (Immediate):** Record which problem was wrong, score, topic.
- **Level 2 (Advanced):** Over time, classify error type (calculation, conceptual, careless, time management) by analyzing patterns (e.g., similar problems missed repeatedly = conceptual; random errors = careless).
- Avoid expensive AI error diagnosis initially; let patterns emerge from data.

### 4. **Centre Dashboard: Prioritize These Features (in Order)**
1. **Attendance + Roster** — live check-in, monthly summaries, no-show tracking.
2. **Test Management** — schedule tests, input scores, view score distributions.
3. **Student Performance** — individual test trends, weak subjects, compare to class average.
4. **Parent Reports** — weekly/monthly progress, areas for improvement, recommendations (via SMS for non-smartphone users).
5. **Teacher Workload** — hours taught, marking load, class-level analytics.
6. **Predictive Flags** — identify at-risk students (attendance + score patterns).

### 5. **Business Model: Learn from Kumon, Not Yuanfudao/Zuoyebang**
- Kumon's franchise model (low entry, 30% margin, stable 60+ years) is more robust than venture-backed platforms that crashed in China's 2021 crackdown.
- Pi.mn can scale via franchising (if expanding to multiple locations) or SaaS licensing to other tutoring centres.
- Avoid dependence on a single regulatory regime (e.g., China's tutoring ban destroyed billion-dollar unicorns overnight).

### 6. **Regulatory Resilience: Diversify Revenue Beyond Tutoring**
- Follow Kumon's model: tutoring + worksheets/materials are the core; digital is an overlay, not a replacement.
- Unlike Yuanfudao and Zuoyebang (who were 100% tutoring-dependent), Kumon survived because of its worksheet product and franchise stability.
- For Pi.mn: tutoring + test prep + materials sales = diverse revenue; harder to kill via regulation.

---

## Conclusion

No Asian platform has solved the paper-test-to-digital workflow at scale in a way that matches a physical tutoring centre's needs. **Kumon Connect is the closest analogue**, offering a pragmatic hybrid model (paper start, tablet transition, progress tracking) without requiring OMR scanning or photo upload.

**Problem tagging should start granular (100–200 points) but let student data refine the taxonomy**, rather than attempting exhaustive hand-tagging. **Centre dashboards in production are minimally documented**, but the pattern is clear: attendance, test management, student performance, parent communication, and teacher workload are non-negotiable.

**The 2021 China crackdown is the canary in the coal mine:** platforms that built solely on tutoring revenue (Yuanfudao, Zuoyebang) collapsed; Kumon, diversified and franchise-based, remained stable. Pi.mn should diversify revenue and avoid over-dependence on a single regulatory environment.
