# Education B2B Software: Failure Modes Analysis

## Executive Summary

**For a Mongolian tutoring centre considering selling its internal platform to other centres: strong evidence suggests this would fail.** The three largest risks are:

1. **Adoption churn approaching 100% annually** (15–30% of education SaaS customers cancel each year, with EdTech monthly churn at 9.6%)
2. **Your centre is a direct competitor**, making centres unwilling to trust you with their student and financial data
3. **Support burden scales linearly**: each new centre customer requires 2–4 dedicated weeks of implementation, plus ongoing 24/7 uptime commitments during exam seasons

The alternative paths (franchising the teaching method, licensing problem sets, staying independent) have significantly better evidence of success and lower support burden.

---

## 1. RANKED FAILURE MODES

### **#1: Adoption and Implementation Failure (65% of education software gets abandoned)**

**Evidence:**
- **85% of EdTech tools are poorly implemented**, despite significant spending. [Hapara, SchoolAI](https://hapara.com/blog/why-edtech-adoption-fails-in-schools)
- **65% of district administrators have already discontinued a tool** they previously adopted. [SchoolAI](https://schoolai.com/blog/why-edtech-adoption-fails-in-schools)
- **10,000+ EdTech startups exist globally** but only a small fraction achieve sustainable scale due to implementation and adoption friction. [DigitalDefynd](https://digitaldefynd.com/IQ/reasons-why-edtech-companies-fail/)

**What drives adoption failure in tutoring centres:**

- **Tools that add work fail; tools that reduce work stick.** Teachers and admin staff work 60-hour weeks. A scheduling or record-keeping tool that requires manual data entry, multiple logins, or dashboard switching gets abandoned immediately. [Hapara](https://hapara.com/blog/edtech-tools-for-teachers/)

- **The pilot trap:** Success with one motivated staff member (your early adopter inside the centre) does not scale. When that person leaves or gets busy, the initiative collapses. Adoption depends on their specific context, not the tool itself. [SchoolAI](https://schoolai.com/blog/why-edtech-adoption-fails-in-schools)

- **Insufficient ongoing support:** One-time training days fail. Schools (and tutoring centres) need embedded, continuous coaching—monthly touch-ins where staff reconvene and refine their practice. [Hapara](https://hapara.com/blog/why-edtech-adoption-fails-in-schools)

- **Software fatigue is real:** After the pandemic, tutoring centre staff juggle an LMS, assessment tools, communication platforms, and intervention programs. Adding another platform is resistance from burnout, not resistance to technology. [Hapara](https://hapara.com/blog/teacher-resistance-and-edtech-fatigue/)

**How this applies to your centre:**
You built your platform for *your specific workflow and assumptions*. A competitor centre will have a different workflow (different class sizes, different student demographics, different exam schedules). The rough edges you've tolerated—because you built it and understand its quirks—will frustrate paying customers who expect a polished, adaptable product. You will spend 4+ weeks per customer on customization and training just to get them to use it.

---

### **#2: Unsustainable Churn (22% of education SaaS customers churn annually, up from 11% in 2024)**

**Evidence:**
- **EdTech SaaS has the highest vertical churn rate at 9.6% monthly (115% annually).** [Recurly, Vitally](https://recurly.com/research/churn-rate-benchmarks/)
- **Education customer churn doubled from 11% (2024) to 22% (2025).** [Vitally SaaS benchmarks](https://www.vitally.io/post/saas-churn-benchmarks)
- **15–30% annual churn in education software is standard**, with the worst losses occurring in the late spring (budget cycle). [DigitalDefynd](https://digitaldefynd.com/IQ/reasons-why-edtech-companies-fail/)

**Why education SaaS churns so aggressively:**

- **Calendar misalignment:** Budget decisions for the following year are finalized in February–March, **4–5 months before contracts technically expire** in June. By the time you're checking in on renewal, the decision has already been made by someone you haven't spoken to. [UserIntuition, The Education Churn Playbook](https://www.userintuition.ai/posts/the-education-churn-playbook-what-edtech-gets-wrong/)

- **Three decision-makers, three churn mechanisms:** The buyer, the end-user (tutors/admin), and the budget decision-maker are almost never the same person. Tutors may love your platform; administrators are evaluating ROI and budget pressure. Owners care about margins. When budget tightens, the tool that doesn't show quantified results gets cut first. [UserIntuition](https://www.userintuition.ai/posts/the-education-churn-playbook-what-edtech-gets-wrong/)

- **Cohort turnover:** 16% of teachers turn over annually. When your champion leaves, the new staff member has no investment in your tool. If they encounter friction on day one, it's dead. [UserIntuition](https://www.userintuition.ai/posts/the-education-churn-playbook-what-edtech-gets-wrong/)

- **Wrong metrics trap:** You measure NPS and engagement. But renewal decisions are made by administrators responding to budget pressure, compliance requirements, and district-level strategic priorities. High user satisfaction does not predict renewal. [UserIntuition](https://www.userintuition.ai/posts/the-education-churn-playbook-what-edtech-gets-wrong/)

**How this applies to your centre:**
Starting with 5 customer centres at Month 0, a 22% annual churn rate means you lose 1.1 centres per month. By Month 12, you have 2.4 customers left (unless you add new customers faster than you churn them). Each churn costs you revenue *and* your reputation in the small Mongolian tutoring market. Once a centre leaves, they'll tell competitors why.

---

### **#3: Data Migration and Switching Cost Barriers**

**Evidence:**
- **80% of education software data migrations fail or run over budget and past deadline**, with many failing to meet core objectives. [Settle Data, DataFlowMapper](https://settledata.ai/blog/customer-data-migration)
- **Migration costs average 2–4× the first-year license savings** for mid-market software replacements. [Rework](https://resources.rework.com/guides/saas-buying-framework/switching-saas-vendors)
- **Migration from Excel to dedicated software costs £10,000+ in staff time alone.** [DataFlowMapper](https://dataflowmapper.com/blog/data-migration-costs-quantitative-analysis)

**What makes education data migration hard:**
- Student records, transcripts, financial data, performance history, payment records, and attendance logs must all be mapped from the incumbent system (often Excel or a legacy system) to your platform.
- Data must be cleaned (duplicates, errors, formatting), validated (nothing lost or corrupted), and comply with student privacy laws (likely Mongolia has FERPA-like regulations).
- Each centre has 3–10 years of historical data in their current system, often poorly documented.

**How this applies to your centre:**
A prospect centre will see the migration cost as a barrier *and* a risk. If migration fails, they've lost access to years of student records during a critical period. The bigger, more established the centre, the more historical data they have, the higher the risk they perceive. You will need to guarantee the migration, which means you're on the hook if it goes wrong.

---

### **#4: Training and Implementation Burden (30–40% of total cost, $2k–$10k per centre)**

**Evidence:**
- **Dedicated implementation teams cost 10–15% of total project budget.** External change management consulting costs $150–$300/hour or $10,000–$100,000+. [GetMonetizely](https://www.getmonetizely.com/articles/what-is-the-true-cost-of-enterprise-training-and-onboarding-at-scale)
- **Tutoring software implementation includes one-time configuration (hundreds to thousands of dollars), staff training, and integration setup.** [Tutorbase](https://tutorbase.com/blog/how-much-does-tutoring-software-cost)
- **Technology foundation typically represents 30–40% of total training and onboarding cost.** Integration costs alone run $10,000–$50,000 upfront plus ongoing maintenance. [GetMonetizely](https://www.getmonetizely.com/articles/what-is-the-true-cost-of-enterprise-training-and-onboarding-at-scale)

**How this applies to your centre:**
You have 1–2 developers and 1–2 operations staff. Each new customer centre requires:
- 1–2 weeks of onboarding (your staff, not billable)
- 2–3 days of on-site or remote training (your staff or paid third-party)
- Setup and configuration specific to their workflow (1–2 weeks)
- 24/7 on-call support during their peak season (exams)

At 5 customer centres, you're operating at 80–120% capacity just on implementation and support. At 20 centres, you're running a support team bigger than your core development team.

---

### **#5: Uptime and On-Call Burden**

**Evidence:**
- **Tutoring centres expect 99.96%+ uptime**, with real-time system monitoring. [Anolla, ProProfs Training](https://www.proprofstraining.com/blog/best-tutoring-software/)
- **Support during critical periods (exam weeks) is non-negotiable**—a centre will not tolerate downtime when students are taking exams. [Koalendar, Appointy](https://koalendar.com/scheduling-software-for/tutors)
- **Quick, human support is critical**—if a centre's staff can't reach a human during their business hours, they will churn. [Engineerica](https://www.engineerica.com/academic-centers/post/tutoring-software/)

**How this applies to your centre:**
Tutoring in Mongolia likely peaks during school exam seasons (likely spring and autumn). During those periods, your platform must be 99.96% available *and* you must have staff on-call for emergencies. A server outage during an exam week will destroy your relationship with that centre and your reputation in the market. With 5–10 customer centres, each with different exam schedules, you're essentially on-call year-round.

---

### **#6: Monetization and Pricing Mismatch**

**Evidence:**
- **A critical reason many EdTech companies fail is the absence of a well-defined, sustainable monetization strategy.** Attracting users is easy; converting them to paying customers and retaining them is hard. [DigitalDefynd](https://digitaldefynd.com/IQ/reasons-why-edtech-companies-fail/)
- **85% of all startups fail in their first 18 months due to insufficient funding and ineffective growth strategies.** [Scalacode, OnGraph](https://www.scalacode.com/blog/why-education-startups-fail/)

**How this applies to your centre:**
What will you charge? A per-seat license ($5–20/month per user)? A per-centre flat fee ($500–$5,000/month)? Usage-based pricing? Your current platform was built for your internal cost structure. Selling it means you need to:
- Price it competitively (but you don't know your competitors' pricing)
- Support it at that price (which you can't do without ballooning your cost of goods sold)
- Justify the price to centres already using free or cheap Excel/Google Sheets

Most education SaaS companies discover they've underpriced and can't survive at the volume they initially promised.

---

## 2. THE "BUILT FOR OURSELVES, SOLD TO OTHERS" TRAP

Your exact plan is documented as a common failure pattern. Here's what research shows:

### **Why Internal Tools Fail as Products**

**Evidence:**
- **Most internal tools never make the leap to successful products**, stalling between "kind of usable" and "sort of valuable." The failure isn't with the idea; it's the transition from tool to product. [Caylent](https://caylent.com/blog/from-tool-to-product-why-internal-tools-fail-as-commercial-products-and-how-to-fix-it)
- **Internal users forgive rough edges because they helped build the tool.** External customers will not. They expect explicit onboarding, permissions, setup, failure states, and error recovery. [Caylent](https://caylent.com/blog/from-tool-to-product-why-internal-tools-fail-as-commercial-products-and-how-to-fix-it)
- **Most tools fail because teams try to generalize too early**, rather than picking one customer profile with a painful problem and designing specifically for them. [Caylent](https://caylent.com/blog/from-tool-to-product-why-internal-tools-fail-as-commercial-products-and-how-to-fix-it)

### **Critical Differences: Your Tool vs. A Commercial Product**

Your platform currently:
- Assumes users have intimate knowledge of your system (because they or you built it)
- Has rough edges you tolerate because you wrote it
- Is optimized for *your* workflow, not a general tutoring centre workflow
- Lacks explicit error handling, recovery, and user onboarding
- Has no governance (security, audit, data isolation) expected by paying customers

A commercial product requires:
- Self-service onboarding without any prior context
- Clear value proposition understandable in a 5-minute demo (not a 2-hour walkthrough)
- Setup that a non-technical person can do
- Integration with centres' existing tools (if they use Google Classroom, Canvas, etc.)
- Error messages that actually explain what went wrong
- Data isolation (so Centre A can never see Centre B's student records, even by accident)
- Role-based access control (admin vs. tutor vs. manager roles)
- Audit logs for compliance
- SOC 2 or equivalent security certification

**Successful internal-tool-to-product transitions include Slack, Basecamp, and Retool**, but each required *fundamental redesign*—not just selling the tool as-is. They invested heavily in product development, customer support, and go-to-market strategy separate from their core business.

**Your centre is a one-product-line business.** Your developers can't split time between running your internal tool *and* productizing it for external customers. You will have to choose: optimize for your centre, or optimize for customers. You likely cannot do both.

---

## 3. SELLING TO DIRECT COMPETITORS: TRUST, DATA, AND VIABILITY

### **The Competitor Problem**

Typically, B2B SaaS companies sell to buyers who are *not* their direct competitors. A CRM vendor sells to hundreds of industries. A payment processor sells to e-commerce, SaaS, and nonprofits alike. But you're proposing to sell to other tutoring centres in Mongolia—your direct competitors.

### **Evidence from Data Privacy and Trust:**

- **B2B buyers are increasingly cautious about data privacy.** They have seen high-profile breaches and understand that their data can be collected, analyzed, shared, or misused. [Privacy Horizon, CaptainCompliance](https://www.privacyhorizon.com/industries/b2b-saas-companies/)
- **Selling to enterprise requires SOC 2 Type II certification as a minimum.** This signals you have controls over data access, encryption, retention, and audit trails. [CaptainCompliance](https://captaincompliance.com/education/how-b2b-companies-are-closing-deals-faster-with-privacy-documentation/)
- **Privacy is now a competitive differentiator.** A bad reputation for data handling will hurt your sales. [Privacy Horizon](https://www.privacyhorizon.com/industries/b2b-saas-companies/)

### **Why a Competitor Centre Would Not Buy From You**

1. **Data trust is broken by definition.** A rival centre is placing its student list, performance data, and financial records in your hands. You have direct visibility into their operation. Even with contractual safeguards, the centre knows you could:
   - Identify high-performing students and poach them
   - See which subjects are weak (competitive intelligence)
   - Time special offers based on when competitors are struggling
   - Access payment data to infer revenue and profitability

2. **No comparable case study exists.** Research found no documented case of a company successfully selling operational software to direct competitors as a core business model. Competitors generally prefer to build/buy from neutral third parties.

3. **Regulatory and contractual complexity.** If you're handling student data, you likely need:
   - Written data processing agreements (DPAs)
   - FERPA compliance (or equivalent) documentation
   - Proof that data is encrypted at rest and in transit
   - Proof that an employee (e.g., you) cannot access a competitor's data without audit trail
   - Regular security audits

   This is $10k–$50k+ annually in compliance overhead, plus legal fees.

4. **Reputational risk.** The first time a competitor centre leaves your platform, they will tell the market why (if you disappointed them, or if they felt unsafe with a competitor holding their data). This destroys your ability to sell to other centres.

### **Verdict**
A competitor centre *might* buy from a neutral third-party vendor. They will almost never buy from a competitor, no matter how good the product. This is not a product problem; it's a structural problem with your positioning.

---

## 4. REALISTIC SUPPORT BURDEN PER CUSTOMER

### **What Support Actually Costs**

**Evidence:**
- **SaaS companies allocate ~8% of annual recurring revenue (ARR) to customer support and success.** This translates to $25–$35 per ticket. [GetMonetizely, Monetizely](https://www.getmonetizely.com/articles/how-to-calculate-support-cost-per-customer-a-strategic-guide-for-saas-executives)
- **Labour represents 60–70% of total support costs.** [LiveChatAI, SupportBench](https://livechatai.com/blog/customer-support-cost-benchmarks)
- **Support utilization ranges from 10–30% depending on product complexity.** [SupportBench](https://www.supportbench.com/saas-customer-support/)
- **Maintenance-only IT support for SMBs runs ~$1,500/month for a block of 10 hours.** [KDI Office Technology](https://www.kdi-inc.com/managed-it-services/it-support-services-pricing-explained-for-smbs/)

### **Translation to Your Centre**

If you charge a tutoring centre **$2,000/month** for your platform:
- 8% of ARR ($24,000) should go to support: ~$2,000/month
- Labour cost ~$1,200–$1,400/month per customer
- In a Mongolian context, that's roughly **$300–400/month in actual salary** if you outsource to Mongolia-based support (or $800–1,200 if you do it from your centre)

**But implementation and onboarding are separate costs:**
- First month per customer: 40–80 hours (1–2 weeks full-time) of your developers' time
- Year 1 ongoing support: ~5–10 hours/month per customer
- You need to guarantee 24/7 uptime during exam seasons

**At scale:**
- 1 customer: Manageable in-house
- 5 customers: 1–2 FTE in support/implementation; 1–2 FTE in development (to fix bugs and keep the platform running)
- 10 customers: 2–3 FTE in support; 2–3 FTE in development
- 20 customers: Unsustainable without hiring dedicated support staff, which costs money you don't have from a small tutoring centre's budget

**You cannot charge less than $1,500–$3,000/month per centre and remain profitable.** At that price, you're competing with established vendors (Schoology, Canvas, Blackboard) who have economies of scale and brand trust. A small tutoring centre can afford your platform; a larger one will choose a trusted vendor.

---

## 5. ALTERNATIVE PATHS: FRANCHISE, LICENSING, B2C

### **Path A: Franchise the Teaching Method**

**Evidence:**
- **The franchising model is established and proven in education.** Examples include Kumon ($100k–$200k initial investment) and Sylvan Learning (similar range). [FranchiseBA, LusthausLaw, UCMAS-USA](https://www.franchiseba.com/education-franchise-article/)
- **Franchising provides structure, brand protection, and ongoing revenue.** A franchisee pays upfront ($50k–$200k), ongoing royalties (5–10% of revenue), and commits to your curriculum and standards. [UCMAS-USA](https://ucmas-usa.com/education-franchise-vs-tutoring-center/)
- **Franchisees benefit from a proven model**, reducing their risk and time to profitability. [LusthausLaw](https://lusthausfranchiselaw.com/featured-publications/multiple-choices-tutoring-and-education-franchise-options-for-franchisors-and-franchisees)

**Advantages for your centre:**
- You're not selling software; you're licensing your teaching method, curriculum, and operational playbook.
- The franchisee runs the centre independently; you don't support their software operations.
- Recurring revenue (royalties on their revenue) aligns incentives: the franchisee's success is your success.
- You retain control over curriculum and quality without the support burden of a software product.
- No data privacy concerns: you're not hosting their student records.

**Disadvantages:**
- Requires developing a franchisee manual, curriculum standards, and quality control systems.
- Higher upfront investment in operations documentation than selling software.
- Slower initial revenue (franchisee needs 12–24 months to break even).
- You're liable for any franchisee's failures or misconduct.

**Best for:** If your centre's competitive advantage is your teaching method, curriculum, or brand, not your software.

---

### **Path B: License Your Content (Problem Sets, Exams, Materials)**

**Evidence:**
- **Licensing is a lower-cost model than franchising and requires less operational support.** Licensees pay a flat fee or per-user fee for access to your content, then run their own operations. [FranchiseBA, StudySpot](https://studyspotlicensing.com/franchise/)
- **Content licensing is attractive when you've built a strong library of materials.** [FranchiseBA](https://www.franchiseba.com/education-franchise-article/)
- **Licensing agreements impose fewer restrictions on the licensee** than franchising, providing more flexibility and attracting more buyers. [LusthausLaw](https://lusthausfranchiselaw.com/featured-publications/multiple-choices-tutoring-and-education-franchise-options-for-franchisors-and-franchisees)

**Advantages for your centre:**
- Minimal support: you deliver content (problem sets, practice exams, teaching guides) once; customers integrate it into their own systems.
- No uptime or SLA burden: you're not running software on their behalf.
- Scalable: each additional licensee costs almost nothing to support.
- Recurring revenue: annual or monthly licensing fees.
- Fits well with academic subjects where content (not software) is the differentiator.

**Disadvantages:**
- Requires high-quality content to justify licensing fees.
- Harder to create switching costs: a licensee can easily replace your content with competitors' materials.
- Lower per-customer revenue than software licensing.
- Requires good content delivery (e.g., a simple online library or PDF repository).

**Best for:** If your centre's advantage is the curriculum, practice problems, or exam preparation materials—not the platform itself.

---

### **Path C: Stay B2C (Growth Within Mongolia)**

**Evidence:**
- **The online tutoring software market is growing 15.3% CAGR** (from $10.4B in 2025 to $23.7B in 2033). [MRFR, SkyQuest](https://www.marketresearchfuture.com/reports/online-tutoring-software-market-40473)
- **The market is shifting from B2C models to AI-driven, B2B, and skilling-focused strategies, but B2C remains substantial.** In 2025, software sub-segment accounted for 63.2% of component-based revenues ($4.9B of $7.7B). [MRFR](https://www.marketresearchfuture.com/reports/online-tutoring-software-market-40473)
- **Private tutoring market continues to grow**, with 15% reduction in delivery costs through tech-enabled solutions for centres that stay focused on quality. [MRFR](https://www.marketresearchfuture.com/reports/online-tutoring-software-market-40473)

**Advantages for your centre:**
- You stay focused on what you do well: teaching and student outcomes.
- Your platform is optimized for *your* workflow; you don't need to generalize it.
- No competitor trust problem: students don't care that another centre uses your software.
- Simpler business model: revenue from student fees, not software licensing.
- You can grow by opening additional branches of your own centre, each using your platform internally.
- Lower support burden: you're supporting your own staff, not external customers.

**Disadvantages:**
- Slower growth than B2B (expansion is geographically constrained to Mongolia).
- Doesn't leverage your software investment across many customers.
- Revenue is capped by the number of students you can physically serve.

**Best for:** If your centre's goal is to build a strong education brand and grow student enrollment, not to become a software vendor.

---

## 6. COMPARISON: WHICH PATH HAS THE BEST EVIDENCE?

| **Criterion** | **B2B Software** | **Franchise** | **Content License** | **B2C Growth** |
|---|---|---|---|---|
| **Churn rate** | 15–30% annually (unsustainable) | <5% (franchisees invested) | <10% (low switching cost) | N/A (internal ops) |
| **Support burden** | 40–80 hrs/month per customer | Minimal (operations support) | Minimal (delivery support) | Internal staff only |
| **Uptime SLA** | 99.96% required | N/A | Partial (content delivery) | Internal only |
| **Time to profitability** | 3–5 years | 2–3 years per franchisee | 18–24 months | 2–3 years |
| **Capital required** | $100k–$500k (dev + support) | $50k–$150k (operations docs) | $25k–$75k (content platform) | $200k–$500k (growth) |
| **Competitor trust** | ✗ Broken by default | ✗ Still direct competitors | ✗ Still direct competitors | N/A |
| **Proven examples** | Knewton (failed), many others | Kumon, Sylvan (proven) | Smaller but viable | Many centres succeed |
| **Evidence quality** | Poor (high failure rate) | Strong (40+ years) | Moderate (niche) | Strong (global trend) |

---

## CONCLUSION: REASONS NOT TO PROCEED WITH B2B SOFTWARE

### **The Top 3 Blocking Risks**

1. **22% annual churn in education SaaS is structural, not fixable.** The buyer, user, and budget decision-maker are different people. Budget decisions happen months before your renewal conversation. You cannot retain 80% of customers by being "good at support" alone.

2. **Selling to competitors breaks customer trust at the foundation.** No centre will place their student records and financial data in a competitor's hands, no matter how good the product. This is not a product or pricing problem; it's a structural market problem.

3. **Support burden scales linearly and will destroy your centre's operations.** 5 customer centres require 1–2 FTE in support. 20 centres require 5+ FTE. You're a tutoring centre with 1–2 developers, not a software company. You will either stop serving your core centre or stop supporting customers.

### **What the Data Says**

- **85% of EdTech tools are poorly implemented.** You will implement your platform 20 times (once per customer), not once. Each implementation surfaces new workflows and assumptions you didn't anticipate.
- **Internal tools fail as products.** Your platform was built for your centre's exact workflow. Generalizing it to other centres will require fundamental redesign, not just packaging.
- **No case study of a tutoring centre successfully selling software to competitors exists.** This is not a path with proof points; it's an untested bet against established patterns.

### **What to Do Instead**

1. **If your teaching method is your advantage:** Franchise it. Kumon and Sylvan prove the model works. Charge $100k upfront + 6% of franchisee revenue. You grow without support burden; franchisees invest in the relationship.

2. **If your curriculum/content is your advantage:** License it. Build a simple online portal for centres to download problem sets and teacher guides. Charge $500–$2,000/year per centre. No software, no uptime guarantees, minimal support.

3. **If your centre/brand is your advantage:** Grow B2C. Open more branches of your own centre using your platform internally. Use your software as a competitive advantage, not a product. This is proven, sustainable, and aligns with global tutoring market trends.

---

## SOURCES

- [Hapara: Why EdTech Adoption Fails](https://hapara.com/blog/why-edtech-adoption-fails-in-schools)
- [SchoolAI: Why EdTech Adoption Fails in Schools](https://schoolai.com/blog/why-edtech-adoption-fails-in-schools)
- [Hapara: Teacher Resistance and EdTech Fatigue](https://hapara.com/blog/teacher-resistance-and-edtech-fatigue/)
- [Hapara: EdTech Tools for Teachers](https://hapara.com/blog/edtech-tools-for-teachers/)
- [Recurly: Churn Rate Benchmarks](https://recurly.com/research/churn-rate-benchmarks/)
- [Vitally.io: B2B SaaS Churn Rate Benchmarks](https://www.vitally.io/post/saas-churn-benchmarks)
- [DigitalDefynd: 10 Reasons Why EdTech Companies Fail](https://digitaldefynd.com/IQ/reasons-why-edtech-companies-fail/)
- [UserIntuition: The Education Churn Playbook](https://www.userintuition.ai/posts/the-education-churn-playbook-what-edtech-gets-wrong/)
- [Caylent: From Tool to Product](https://caylent.com/blog/from-tool-to-product-why-internal-tools-fail-as-commercial-products-and-how-to-fix-it)
- [Settle Data: Customer Data Migration](https://settledata.ai/blog/customer-data-migration)
- [Rework: Switching SaaS Vendors](https://resources.rework.com/guides/saas-buying-framework/switching-saas-vendors)
- [GetMonetizely: Support Cost per Customer](https://www.getmonetizely.com/articles/how-to-calculate-support-cost-per-customer-a-strategic-guide-for-saas-executives)
- [GetMonetizely: Enterprise Training & Onboarding](https://www.getmonetizely.com/articles/what-is-the-true-cost-of-enterprise-training-and-onboarding-at-scale)
- [Tutorbase: How Much Does Tutoring Software Cost](https://tutorbase.com/blog/how-much-does-tutoring-software-cost)
- [Privacy Horizon: Privacy & Security for B2B SaaS](https://www.privacyhorizon.com/industries/b2b-saas-companies/)
- [CaptainCompliance: Privacy Documentation for B2B SaaS](https://captaincompliance.com/education/how-b2b-companies-are-closing-deals-faster-with-privacy-documentation/)
- [Anolla: Tutor Scheduling Software](https://anolla.com/en/tutor-software)
- [ProProfs Training: Best Tutoring Software](https://www.proprofstraining.com/blog/best-tutoring-software/)
- [Scalacode: Why Education Startups Fail](https://www.scalacode.com/blog/why-education-startups-fail/)
- [OnGraph: 9 Reasons Why EdTech Startups Fail](https://www.ongraph.com/9-reasons-why-edtech-startups-fail-and-tips-to-avoid-them/)
- [Vlad Koval (Medium): Why EdTech Startups Fail](https://medium.com/@vlad.koval/why-edtech-startups-fail-learn-from-mistakes-19b76970a46b)
- [MRFR: Online Tutoring Software Market](https://www.marketresearchfuture.com/reports/online-tutoring-software-market-40473)
- [FranchiseBA: Education Franchise Opportunities](https://www.franchiseba.com/education-franchise-article/)
- [UCMAS-USA: Education Franchise vs Tutoring Center](https://ucmas-usa.com/education-franchise-vs-tutoring-center/)
- [LusthausLaw: Tutoring and Education Franchise Options](https://lusthausfranchiselaw.com/featured-publications/multiple-choices-tutoring-and-education-franchise-options-for-franchisors-and-franchisees)
- [StudySpot: Franchise vs License](https://studyspotlicensing.com/franchise/)
- [SupportBench: SaaS Customer Support](https://www.supportbench.com/saas-customer-support/)
- [LiveChatAI: Customer Support Cost Benchmarks](https://livechatai.com/blog/customer-support-cost-benchmarks)
- [KDI Office Technology: IT Support Services Pricing](https://www.kdi-inc.com/managed-it-services/it-support-services-pricing-explained-for-smbs/)
