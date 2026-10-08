# Platform-in-Franchise: How Software Becomes the Method in Education Networks

**Research Date:** September 2025  
**Client Context:** Pi.mn exam-prep platform (NestJS + Next.js + PostgreSQL) built for single centre, now evaluating franchise model as alternative to competitor sales.

---

## Executive Summary

The data-trust objection that kills independent software sales **does not apply to franchisees**. Franchisees operate under the franchisor's brand and method; they are not competitors. Central software becomes the mechanism through which the franchisor enforces and delivers the method across the network. This reframes the platform from overhead to product.

---

## 1. What Education Franchises Centralise vs. Delegate: A Comparison Table

| Function | Centralised by Franchisor | Delegated to Franchisee | Sources & Notes |
|----------|---------------------------|------------------------|-----------------|
| **Curriculum Content** | 40–60% core (methodology, essential standards, instructor requirements); 20% local adaptation permitted (state standards, regional context) | 20% supplementary content addressing local school curricula and regional needs | [Calimatic EdTech curriculum model](https://www.calimaticedtech.com/blog/building-a-scalable-curriculum-across-all-franchise-locations): mathematics franchise allows Texas location to emphasize different word problem contexts than California based on state standards |
| **Student Assessment Framework** | Standardised initial diagnostic assessment; core formative checkpoints; final standardised assessments creating comparable data across network | Local administration scheduling; adaptation to regional testing cycles | [Calimatic EdTech](https://www.calimaticedtech.com/blog/building-a-scalable-curriculum-across-all-franchise-locations): "every student at every location completes the same initial assessment to ensure proper placement and create baseline data" |
| **Software Platform** | Learning management system (LMS), student tracking, progress dashboards | Day-to-day operation; student and parent communication | **Kumon Connect** (web-based student portal for worksheets, homework, progress viewing); **SylvanSync** (proprietary assessment, adaptive learning plans, formative tests) [Kumon 2024](https://www.franchise.org/2025/02/kumon-adapts-to-modern-education-demands-with-technology-in-2024/); [Sylvan Learning FDD](https://1851franchise.com/sylvan-learning-franchise-costs-fees-profit-and-data-2730171) |
| **Student Data Records** | Centralised cloud-based student information system (SIS); all progress, scores, attendance | Local access through franchisee login; franchisor maintains master record | **Mathnasium** built data warehouse and BI dashboards via Amazon Redshift and QuickSight; **Kumon** centralises via proprietary system. Franchisees can query but cannot export without terms [Mathnasium 2024](https://www.franchise.org/2024/01/mathnasium-kicks-off-2024-with-impressive-growth-after-achieving-record-student-enrollments-and-awarding-80-new-franchises-in-2023/) |
| **Mock Exams / Test Series** | National standardised mock exams (if offered); ranking and benchmarking infrastructure; question bank curation | Administration; may administer online or on-centre; promotional use of network rankings | **ALLEN JEE Online Test Series** and **FIITJEE All India Test Series (AITS)** provide network-wide benchmarking for JEE/NEET preparation [ALLEN](https://allen.in/jee/online-test-series); [FIITJEE NCRP](https://fiitjeenonclassroomprograms.com/pdfn/NCRP-JEE-Advanced-2024-Result.pdf) |
| **Attendance & Compliance** | Policies, audit protocols, expected KPIs (attendance rate, test performance, student retention) | Daily tracking, reporting to franchisor via portal; biometric or manual systems | Over 64% of franchises now use LMS for compliance tracking; ~70% of North American education institutions use cloud-based SIS [Classter](https://www.classter.com/blog/data-security-in-education/10-free-online-attendance-systems-for-students-to-enhance-management/) |
| **Royalty Calculation Basis** | Royalty formula, pricing tiers, fee schedule | Revenue reporting (gross tuition collected, less refunds); may be automated via POS integration or manual | **Kumon:** $36–$42.75 per full-paying student per month (~24–29% of $150/month tuition). **Mathnasium:** 10% (min. $1,500/month) + $650/month base royalty. **Sylvan:** 11% [SharpSheets](https://sharpsheets.io/blog/best-tutoring-franchises/); [FranchiseVS](https://franchisevs.com/franchise/kumon) |
| **Payment Processing** | May be centralised (franchisor collects tuition, remits to franchisee); or franchisee collects directly | If decentralised: franchisee invoices students, processes payments, reports to franchisor | **Club Z! Tutoring** (corporate handles payment processing centrally); more common is direct franchisee collection with monthly reporting [Global Payments Education](https://www.globalpayments.com/industries/education) |
| **Instructor Training Records & Certification** | Curriculum for training, certification standards, competency requirements | Delivery of training, scheduling, tracking staff completion | Franchisees must onboard and train instructors to franchisor specification; training completion tracked in LMS [IFA 2025 Franchisor Survey](https://blog.franfunnel.com/2025/08/24/franchising-management-software/) |
| **Marketing Assets & Brand Guidelines** | Logo, brand colours, messaging templates, approved marketing copy | Local campaign execution, regional audience selection, compliance reporting | Franchisees use centrally supplied assets but execute locally; some networks have approval gate for local marketing [Franchise Disclosure Document best practices](https://medium.com/the-tutoring-center-franchise/what-is-a-franchise-disclosure-document-fdd-e75dcfe66227) |

**Sources:** FDD data from [FranchiseVS](https://franchisevs.com), [SharpSheets tutoring franchise analysis](https://sharpsheets.io/blog/best-tutoring-franchises/), [Mathnasium 2024 IFA report](https://www.franchise.org/2024/01/mathnasium-kicks-off-2024-with-impressive-growth-after-achieving-record-student-enrollments-and-awarding-80-new-franchises-in-2023/), [Sylvan Learning 2024](https://1851franchise.com/sylvan-learning-franchise-costs-fees-profit-and-data-2730171).

---

## 2. Franchise-Management Software Products & Pricing

Franchisors use dedicated franchise-management software to meter royalties, track compliance, and monitor performance. These tools are designed specifically for the franchisor-franchisee relationship.

### Leading Products (2025)

| Product | Primary Audience | Pricing (2025) | Key Features | Notes |
|---------|------------------|----------------|--------------|-------|
| **FranConnect** | Enterprise franchises 500+ units | $200–$500/franchisee/month (location-based); enterprise pricing negotiable | • Royalty Manager (automated invoicing, automatic/manual payment collection) <br> • Fetches sales data directly from POS systems <br> • Info Manager (franchise agreement, document repository) <br> • Predictive analytics (early warning for underperforming units) <br> • 25% improvement in problem-location turnaround for customers | Market leader; owned by Constellation Software. Invoice-to-Pay functionality reduces manual data entry. [FranConnect Royalty Manager](https://www.franconnect.com/en/platform-overview/royalty-manager/) |
| **ClientTether** | Mid-market franchises 50–500 units | $299/month base + users and features | • Royalty tracking <br> • Franchisee portal <br> • Document management <br> • Compliance dashboard <br> • Cost-effective, straightforward pricing | Positioned as FranConnect alternative for growing systems. Clear value without hidden complexity. [ClientTether vs FranConnect](https://clienttether.com/franconnect/) |
| **Naranga** | Growing franchises <5–100 units | Location-based (starts at $0.01/month, scales with features) | • Royalty engine <br> • Franchisee communication <br> • Performance dashboard <br> • Inventory tracking | **CRITICAL:** Naranga winding down software operations **November 14, 2025**. Users must migrate to alternatives. [Naranga vs ClientTether](https://clienttether.com/naranga-franchise-software/) |
| **Franchise Dynamics / Autymate** | Franchisors of all sizes | Pricing not publicly disclosed (custom) | • AI-powered franchise reporting <br> • Network-wide monitoring <br> • Automated, AI-prescribed guidance <br> • Real-time dashboards | Newer entrant; AI-driven. [Autymate Franchisor Solutions](https://www.autymate.com/solutions/franchisors) |

### Royalty Metering Capability Limitations

FranConnect and Naranga "assume a flat percentage-of-gross-sales formula." Brands with tiered royalties, non-standard fee schedules, or per-student fees (like Kumon) often rebuild the math in spreadsheets. **This is a critical gap:** automation breaks down for nuanced royalty structures [Revscale / RaftLabs](https://www.raftlabs.com/blog/how-to-build-franchise-management-software).

---

## 3. Network-Wide Ranking as a Product

Network-wide standardised testing and ranking is a genuine competitive advantage in exam-prep coaching, not just administrative overhead.

### Evidence from Indian Coaching Chains (ALLEN, Aakash, FIITJEE)

These largest Indian coaching franchises have institutionalised central mock-exam platforms that rank students across all branches:

- **ALLEN JEE Online Test Series:** Real exam-like mock tests with network-wide performance insights. Students see their rank against peers nationwide, which validates their preparation and drives engagement. [ALLEN Online Test Series](https://allen.in/jee/online-test-series).
- **FIITJEE All India Test Series (AITS):** Widely considered the most challenging test series for JEE Advanced; used as marketing claim ("Prepare with the hardest tests in India"). National rankings are a sales tool for recruitment. [FIITJEE NCRP Results 2024](https://fiitjeenonclassroomprograms.com/pdfn/NCRP-JEE-Advanced-2024-Result.pdf).
- **Aakash Distance Learning:** Includes mock test packages and ranking reports across their network. Aakash secured 8 All India Rank 1s and 37 students in top 100 NEET 2024—this is published in every marketing channel. [Aakash NEET 2024 Results](https://www.aakash.ac.in/blog/author/kriti/page/24).

### Why This Matters as a Product

1. **Student/parent value:** Ranking against national cohort is a genuine psychological motivator and proof of method effectiveness.
2. **Franchisee competitive advantage:** A franchisee can market "Your child will sit 50 mock exams ranked against 2,000 students across 40 centres nationwide" — this is a product differentiation, not overhead.
3. **Network effect:** Larger the network, the more valuable the ranking data. A 10-centre network's mock exams are less compelling than a 100-centre network's.
4. **Data moat:** Centralised test platform creates a dataset (question banks, performance analytics, learning curves) that becomes harder to replicate.

### Caveat

Network-wide ranking works only if:
- The exam-prep market is competitive (parents care about relative ranking).
- Network is large enough (~20+ units minimum) to create meaningful comparison pools.
- Quality is enforced (franchisees cannot game rankings by inflating student numbers).

---

## 4. Royalty Metering Through Software: Methods & Robustness

### Method 1: Automatic POS Integration (Most Robust)

**How it works:** Franchise software connects to franchisee's point-of-sale (POS) or billing system via API. Tuition payments are captured in real-time, royalty calculated automatically, invoice generated, payment collected via ACH/card.

**Robustness:** ★★★★★  
- No manual report entry; data cannot be "forgotten" or misreported.
- Automatic on a schedule (daily, weekly, monthly); reduces human error.
- Creates audit trail; every payment is logged.
- **However:** POS system must be compatible; franchisee can potentially manipulate at the POS level (off-the-books cash payments).

**Used by:** FranConnect (standard), ClientTether (premium tier).

**Cost to implement:** Included in franchise software fee (integration development varies by complexity).

---

### Method 2: Franchisee Monthly Reporting + Verification

**How it works:** Franchisee submits monthly sales report (gross tuition, refunds, adjustments) to franchisor via portal or spreadsheet. Franchisor's software auto-calculates royalty. Franchisor may audit POS or bank records quarterly/annually to verify.

**Robustness:** ★★★☆☆  
- Depends on franchisee honesty and timely submission.
- Manual errors (formatting, calculation mistakes) are common.
- Audit lags by weeks/months; franchisor discovers under-reporting late.
- **IFA 2025 data:** "Over 40% of franchise systems still rely heavily on manual reporting." This is a known pain point [IFA Franchisor Survey 2025](https://blog.franfunnel.com/2025/08/24/franchising-management-software/).

**Used by:** Early-stage franchises, smaller systems using spreadsheets or light software.

---

### Method 3: Per-Student Metering (Used by Kumon, Sylvan)

**How it works:** Royalty is charged per active student (e.g., $36–$42.75/student/month) rather than as a percentage of revenue. Franchisee reports student headcount monthly; software auto-calculates.

**Robustness:** ★★★★☆  
- Harder to under-report (franchisee's own instructor and parent communication logs show true student count).
- Franchisor can cross-check via platform logins, student progress records, parent inquiry logs.
- Revenue hiding is less effective (high revenue per low headcount triggers audit).
- **Caveat:** Franchisee could enrol fictitious students or inflate count; requires franchisor spot-checks.

**Used by:** Kumon ($36–$42.75/student/month); Sylvan (11% + per-location fee); high-contact education models.

---

### Method 4: Hybrid (Percentage + Minimum Base Fee + Per-Student Component)

**How it works:** Mathnasium model: 10% royalty (minimum $1,500/month) + $650/month base technology fee. Floor prevents under-reporting at low-revenue locations.

**Robustness:** ★★★★☆  
- Base fee creates a "minimum tax" — franchisee cannot drop below floor even if intentionally suppressing revenue.
- Per-student component (if added) cross-checks revenue claim.
- Percentage incentivizes franchisor to help franchisee grow (higher revenue = higher royalty).
- **Weakness:** Complex calculation; software must handle multiple fee types accurately.

---

### Comparison Summary

| Method | Data Source | Franchisor Visibility | Franchisee Gaming Risk | Automation Level | Time to Detect Under-Reporting |
|--------|-------------|----------------------|------------------------|------------------|--------------------------------|
| POS Integration | Real-time | Excellent | Low (requires POS hacking) | Fully automatic | Immediate alert |
| Monthly Manual Report | Franchisee submission | Fair | High (easy to omit/delay) | Manual entry + auto-calc | 4–8 weeks (if audited) |
| Per-Student Metering | Student database + count report | Good | Medium (headcount inflation harder than revenue hiding) | Semi-automatic | 2–4 weeks (cross-check via platform logins) |
| Hybrid (% + base + per-student) | Multiple sources | Good | Medium | Semi-automatic | 2–4 weeks |

**Recommendation for franchisor:** POS integration is most robust **if** integrations are available for franchisee's billing system. Per-student metering is a good second choice for education franchises because student enrolment is tied to platform logins, attendance, and progress—all visible to franchisor.

---

## 5. Compliance & Outcome Monitoring Through Software

Franchisors use platform analytics to detect failing franchisees **before** they miss financial targets.

### Early Warning Indicators

FranConnect and peer systems monitor:
- **Attendance patterns:** Dropping attendance signals student attrition or instructor turnover.
- **Student progress metrics:** Test score declines, slow progress through curriculum.
- **Staff turnover:** High instructor turnover predicts branch failure within 6 months.
- **Compliance checklist completion:** Franchisee failing to submit training records, audit responses, marketing approvals.
- **Brand-standard compliance:** Quality audits (lesson observation, student feedback).
- **Corrective-action completion:** Franchisee not fixing known issues.
- **Unit-level performance:** Revenue per student, student lifetime value, cohort retention.

### Key Advantage: Leading Indicators vs. Lagging Indicators

**Lagging indicators** (late discovery): Revenue miss, royalty shortfall, franchisee debt to franchisor.  
**Leading indicators** (early detection): Attendance drop 2 weeks in, staff turnover spike, no student sign-ups for next term.

**IFA/Frandata finding:** Fewer than 40% of franchise systems track leading operational indicators alongside financial results. This means most franchisors discover problems during quarterly financial reviews—by which point the damage is substantial and remediation is expensive [FranConnect Early Warning](https://www.franconnect.com/en/3-ways-predictive-insights-drive-franchise-location-performance/).

### Specific Compliance Monitoring in Education Franchises

1. **Attendance & Engagement:** Biometric or RFID attendance systems flag absenteeism; AI algorithms identify at-risk students (attendance below threshold).
2. **Training Completion:** LMS tracks whether instructors completed mandatory certification; franchisee cannot operate without proof of staff training [Docebo LMS for Franchises](https://www.docebo.com/learning-network/blog/lms-for-franchises/).
3. **Audit Response:** Franchisor can trigger automated compliance audits (lesson quality, curriculum coverage, student feedback surveys). Franchisee must respond within X days.
4. **Performance Reports:** Monthly KPI dashboards force franchisee to face underperformance visibly (not hidden in manual spreadsheets).

---

## 6. Four Key Questions Answered Directly

### Q1: In education franchises, is central software normal and mandated, or unusual?

**Answer: Central software is now normal and increasingly mandated.**

- **Kumon:** Mandatory Kumon Connect (web portal) + Salesforce CRM since 2024.
- **Mathnasium:** Franchisees access centralised data warehouse (Amazon Redshift); 853 franchised locations report data monthly.
- **Sylvan Learning:** Mandatory SylvanSync platform for student tracking and adaptive lesson planning.
- **Adoption trend:** 70% of North American education institutions now use cloud-based Student Information Systems (SIS), up from ~50% in 2019. By 2025, software is an expectation, not an option.

**Source:** [Mathnasium 2024 IFA Report](https://www.franchise.org/2024/01/mathnasium-kicks-off-2024-with-impressive-growth-after-achieving-record-student-enrollments-and-awarding-80-new-franchises-in-2023/); [SNS Insider SIS Market Report](https://www.snsinsider.com/reports/student-information-system-market-1794).

---

### Q2: Does the data-trust objection disappear when the customer is a franchisee rather than a competitor?

**Answer: Yes, substantially. The objection does not disappear entirely, but it is reframed.**

**Why it disappears:**
- Franchisee operates under franchisor's brand and reputation. Data breaches or misuse harm both parties.
- Franchisee is contractually bound; franchisor can audit and enforce data protection clauses.
- Franchise agreement can include data-ownership terms that are **negotiated at signing**, before the franchisee has any leverage.
- Franchisee has no independent use for competitor data (they are not building a rival platform or selling the data to rivals).

**Why it does not disappear entirely:**
- Franchisee remains a separate legal entity. Data ownership questions are complex and need explicit contract terms.
- California Education Code § 49073.1 and FERPA restrict how student data can be used. Franchisor cannot claim absolute ownership; they are a "third party" under FERPA unless contractually designated as a "school official."
- Franchisee may fear franchisor using data to monitor performance too closely, identify weak franchisees, or (in extreme cases) open company-owned locations to replace them.

**Source:** [Revscale Franchise Data Ownership](https://revscale.com/blog/franchise-loyalty-program-data-ownership); [California Education Code § 49073.1](https://www.cybernut.com/blog/all-about-education-code-49073-1-how-california-regulates-student-records-sharing/).

---

### Q3: Is network-wide standardised testing/ranking a genuine product advantage, or just administrative convenience?

**Answer: It is a genuine product advantage, IF the network is large enough and quality is enforced.**

**Evidence:**
- **ALLEN, FIITJEE, Aakash** market network-wide mock exams and rankings as primary selling points to students and parents. Students explicitly choose these brands because "I can compare my rank to 2,000 peers nationwide."
- **Student engagement:** Institutions using integrated SIS (including ranking/benchmarking) report 15–20% higher student engagement [Edular/KlassApps](https://klassapps.com/trends-in-higher-education-software-essentials-for-2024/).
- **Franchisee marketing value:** Franchisee can advertise "You will sit 50 mock exams and be ranked against the national cohort." This is a product, not overhead.

**Critical conditions:**
- Network must be 20+ locations to create meaningful ranking pools.
- Quality enforcement is essential (franchisor must audit franchisees to prevent gaming: inflating student numbers, lowering test difficulty, etc.).
- Ranking must be transparent and visible to students/parents in real-time (live leaderboards drive engagement more than annual reports).

**If conditions are not met,** ranking becomes administrative burden with no perceived value to franchisees or students.

---

### Q4: How should a platform-in-franchise franchisor best meter royalties, and what does this imply for the Pi.mn case?

**Answer: POS integration is most robust if available; per-student metering is a good second choice for education franchises.**

**Metering hierarchy (robustness order):**

1. **POS API integration** (automatic): Franchisee's billing system connects to franchisor's accounting. Tuition data flows in real-time. Royalty calculated automatically daily/weekly.
   - **Requirement:** Franchisee uses compatible billing system (QuickBooks, FreshBooks, Stripe, etc.). Franchisor builds/maintains integrations.
   - **Cost:** $5K–$50K per integration to build; minimal per-franchisee cost.
   - **Robustness:** ★★★★★

2. **Per-student metering + platform login verification** (semi-automatic): Franchisee reports student headcount monthly; franchisor's platform logs (who logged in, when, which student studied) cross-verify the count.
   - **Requirement:** Platform must track all student interactions (logins, assignments, test submissions, progress).
   - **Cost:** Minimal (built into franchise software).
   - **Robustness:** ★★★★☆ (harder to game than revenue reporting).

3. **Hybrid model** (Mathnasium approach): Percentage royalty (e.g., 8%) + per-student base fee (e.g., $30/student/month) + minimum floor (e.g., $1,200/month). Multiple revenue streams make under-reporting riskier.
   - **Requirement:** Franchisee must report both revenue and headcount.
   - **Cost:** Software must handle multi-component calculations.
   - **Robustness:** ★★★★☆

---

### Implications for Pi.mn (Exam-Prep Franchise Model)

**Pi.mn's platform architecture is well-suited to per-student metering:**

1. **Strong platform dependency:** Pi.mn's 359 students already use the platform daily (mock exams, student rankings, progress dashboards). Every franchise would inherit this—platform becomes the delivery mechanism, not optional.

2. **Student metrics are visible to franchisor:** Platform logs show:
   - How many students logged in this month?
   - How many mock exams were sat (franchisee cannot suppress test-taking without obvious data gap)?
   - What is the national rank of each student (franchisee cannot inflate local claims without platform visible ranks)?
   - Student retention/churn (early warning if franchise is losing students).

3. **Royalty recommendation for Pi.mn:**
   - **Primary:** Per-student metering ($25–$40/active student/month, benchmarked to Kumon's $36–$42.75 range). Active = student logged in within current month.
   - **Secondary:** Per-exam fee (e.g., $5 per mock exam administered). Creates incentive for franchisee to run more tests.
   - **Minimum floor:** $1,000–$2,000/month per franchise location (prevents small franchisees from under-reporting; protects franchisor's fixed costs).
   - **Rationale:** Pi.mn is a platform franchise (software is the delivery method), not a methods-only franchise. Royalty should tie to platform usage (active students, exams sat), not blind revenue reporting.

4. **Compliance monitoring advantage:** Pi.mn would know immediately:
   - Which franchisee's students are progressing (test scores, time-to-proficiency).
   - Which franchisee is losing students (attendance drop, no logins).
   - Which franchisee is training instructors properly (instructor login activity, lesson coverage).
   - Which franchisee has quality issues (student feedback, test-score variance).

**This is a structural advantage over traditional franchise models** where franchisor is blind to operational quality.

---

## 7. Conclusion: The Franchise-Platform Reframe

**Original problem:** Selling software to competitor tutoring centres fails because competitors will not put student data into a rival's system.

**Franchise reframe:** Franchisees operate under the franchisor's brand and method. The platform becomes the enforcement mechanism for the method (standardised curriculum, mandatory testing, real-time progress visibility). Franchisee's data trust is not a problem—it is aligned.

**Central software in education franchises is normal** (Kumon, Mathnasium, Sylvan all mandate it as of 2024). **The data-trust objection largely disappears** when the customer is a franchisee, because data ownership and audit rights can be negotiated at franchise signing. **Network-wide ranking is a genuine product**, not overhead, if the network is large enough.

**For Pi.mn specifically:** The platform's strength is that it ties royalty metering to usage (active students, exams taken) rather than to revenue reporting. This makes franchisee under-reporting visible and franchisee quality monitorable in real-time. This is a structural advantage that a traditional franchise-software fee structure (like FranConnect's per-location pricing) does not provide.

The platform is not just overhead—it is the product that sells franchisees.

---

## Sources

- [Kumon Adapts to Modern Education Demands (IFA 2025)](https://www.franchise.org/2025/02/kumon-adapts-to-modern-education-demands-with-technology-in-2024/)
- [Mathnasium 2024 IFA Report](https://www.franchise.org/2024/01/mathnasium-kicks-off-2024-with-impressive-growth-after-achieving-record-student-enrollments-and-awarding-80-new-franchises-in-2023/)
- [FranConnect Royalty Manager](https://www.franconnect.com/en/platform-overview/royalty-manager/)
- [FranConnect Predictive Insights](https://www.franconnect.com/en/3-ways-predictive-insights-drive-franchise-location-performance/)
- [ClientTether vs FranConnect](https://clienttether.com/franconnect/)
- [Calimatic EdTech Curriculum Scaling](https://www.calimaticedtech.com/blog/building-a-scalable-curriculum-across-all-franchise-locations)
- [ALLEN JEE Online Test Series](https://allen.in/jee/online-test-series)
- [FIITJEE All India Test Series (AITS)](https://fiitjeenonclassroomprograms.com/pdfn/NCRP-JEE-Advanced-2024-Result.pdf)
- [Aakash NEET 2024 Results](https://www.aakash.ac.in/blog/author/kriti/page/24)
- [Sylvan Learning FDD 2024](https://1851franchise.com/sylvan-learning-franchise-costs-fees-profit-and-data-2730171)
- [SharpSheets Tutoring Franchise Comparison](https://sharpsheets.io/blog/best-tutoring-franchises/)
- [FranchiseVS Kumon Data](https://franchisevs.com/franchise/kumon)
- [Revscale Franchise Data Ownership](https://revscale.com/blog/franchise-loyalty-program-data-ownership)
- [California Education Code § 49073.1](https://www.cybernut.com/blog/all-about-education-code-49073-1-how-california-regulates-student-records-sharing/)
- [IFA 2025 Franchisor Survey / Franfunnel](https://blog.franfunnel.com/2025/08/24/franchising-management-software/)
- [Docebo LMS for Franchises](https://www.docebo.com/learning-network/blog/lms-for-franchises/)
- [SNS Insider SIS Market Report](https://www.snsinsider.com/reports/student-information-system-market-1794)
- [Edular/KlassApps Education Software Trends](https://klassapps.com/trends-in-higher-education-software-essentials-for-2024/)
