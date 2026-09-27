// Original synthetic examples. No private workbook or student records.
export const formulaSections = [
  {
    slug: "numbers-algebra",
    title: "Тоо ба алгебр",
    order: 1,
    icon: "sigma",
    description: "Зохиомол томьёоны бүлэг",
    count: 2,
  },
  {
    slug: "equations-inequalities",
    title: "Тэгшитгэл",
    order: 2,
    icon: "constructor",
    description: null,
    count: 1,
  },
];
export const formulaSummaries = [
  {
    id: "synthetic-f1",
    name: "Нийлбэрийн квадрат",
    description: null,
    slug: "synthetic-square-sum",
    title: "Нийлбэрийн квадрат",
    section: "numbers-algebra",
    order: 1,
    level: "CORE",
    grade: 8,
    topicSlugs: ["ALG"],
    latex: "(a+b)^2=a^2+2ab+b^2",
    general: "(x+y)^2=x^2+2xy+y^2",
    widget: "square-of-sum",
  },
  {
    id: "synthetic-f2",
    name: "Нийлбэрийн куб",
    description: null,
    slug: "synthetic-cube-sum",
    title: "Нийлбэрийн куб",
    section: "numbers-algebra",
    order: 2,
    level: "EXTRA",
    grade: 10,
    topicSlugs: ["ALG"],
    latex: "(a+b)^3=a^3+3a^2b+3ab^2+b^3",
    general: "(x+y)^3=x^3+3x^2y+3xy^2+y^3",
    widget: "constructor",
  },
  {
    id: "synthetic-f3",
    name: "Шугаман тэгшитгэл",
    description: null,
    slug: "synthetic-linear",
    title: "Шугаман тэгшитгэл",
    section: "equations-inequalities",
    order: 1,
    level: "CORE",
    grade: 7,
    topicSlugs: ["RATEQ"],
    latex: "ax=b",
    general: "x=\\frac{b}{a}",
    widget: null,
  },
];
export function formulaDetail(slug: string) {
  const item = formulaSummaries.find((f) => f.slug === slug);
  if (!item) return null;
  const section = formulaSections.find((s) => s.slug === item.section)!;
  const common = {
    ...item,
    updatedAt: "2026-09-27T00:00:00.000Z",
    quiz: [
      {
        type: "blank",
        prompt: "1+1=\\square",
        answer: "2",
        distractors: ["1", "3"],
      },
      {
        type: "truefalse",
        prompt: "1+1=2",
        answer: "true",
        why: "Хоёр нэгийг нэмнэ.",
      },
    ],
    section: { slug: section.slug, title: section.title, icon: section.icon },
    variants: [],
    conditions: [],
    derivation: [],
    examples: [],
    commonMistakes: [],
    explanation: null,
    mnemonic: null,
    eeshTip: null,
    related: [],
    practice: [],
  };
  if (slug !== "synthetic-square-sum") return common;
  return {
    ...common,
    variants: [{ label: "Урвуу хэлбэр", latex: "a^2+2ab+b^2=(a+b)^2" }],
    conditions: ["a,b\\in\\mathbb{R}"],
    explanation: "Хоёр тооны нийлбэрийг өөрөөр нь үржүүлнэ.",
    derivation: ["$(a+b)^2=(a+b)(a+b)$", "$=a(a+b)+b(a+b)$", "$=a^2+2ab+b^2$"],
    mnemonic: "Хоёр квадратын дунд давхар үржвэр бий.",
    examples: [
      {
        problem: "$a=2$, $b=3$ үед $(a+b)^2$-ыг ол.",
        steps: ["$a+b=2+3=5$", "Нийлбэрийг өөрөөр нь үржүүлбэл $5\\cdot5=25$."],
        answer: "$25$",
      },
      {
        problem: "$a=1$, $b=2$ үед $(a+b)^2$-ыг ол.",
        steps: ["$1+2=3$", "$3^2=9$"],
        answer: "$9$",
      },
    ],
    commonMistakes: ["Дундах $2ab$ гишүүнийг орхиж болохгүй."],
    eeshTip: "Хоёр талын ижил утгыг шалгаарай.",
    related: [
      {
        slug: "synthetic-cube-sum",
        title: "Нийлбэрийн куб",
        latex: item.latex,
      },
    ],
    practice: [
      {
        problemId: "synthetic-formula-problem",
        token: "SYN-001",
        statementText: "$(x+2)^2$-ыг задал.",
        chapterTitle: "Зохиомол дасгал",
      },
    ],
  };
}
export function seenFormulas(studentId: string) {
  const dates = [
    "2026-09-26T16:10:00.000Z",
    "2026-09-22T03:00:00.000Z",
    "2026-09-01T03:00:00.000Z",
  ];
  return {
    totalFormulas: 3,
    seenFormulas: 3,
    items: formulaSummaries.map((f, i) => ({
      slug: f.slug,
      title: f.title,
      section: formulaSections.find((s) => s.slug === f.section),
      latex: f.latex,
      general: f.general,
      firstSeenAt: dates[i],
      lastSeenAt: dates[i],
      seenCount: 10,
      correctCount: [8, 5, 4][i],
      lastTestTitle:
        studentId === "synthetic-child-b"
          ? "Хоёр дахь хүүхдийн шалгалт"
          : "Эхний хүүхдийн шалгалт",
    })),
  };
}
