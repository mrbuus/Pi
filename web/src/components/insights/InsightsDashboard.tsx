"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TestReportCard from "./TestReportCard";
import TopicHeatmap from "./TopicHeatmap";
import ProblematicProblems from "./ProblematicProblems";
import DiscriminationAlert from "./DiscriminationAlert";
import TopMistakes from "./TopMistakes";
import type { TestInsights } from "./types";
import { EmptyState } from "@/components/ui/StateBlock";

// Мокап өгөгдөл (API байхүү хүүлэх үед ашигла)
const MOCK_INSIGHTS: TestInsights = {
  testId: "test-001",
  testTitle: "Хэмжээ ба хэлбэр",
  classroomId: "class-001",
  classroomName: "11-Б анги",
  conductedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  stats: {
    totalAttempts: 28,
    passCount: 18,
    failCount: 10,
    averageScore: 72.5,
    medianScore: 75,
    stdDeviation: 12.3,
    minScore: 45,
    maxScore: 95,
    scoreDistribution: [
      { bin: "40-50", count: 2 },
      { bin: "50-60", count: 3 },
      { bin: "60-70", count: 5 },
      { bin: "70-80", count: 10 },
      { bin: "80-90", count: 6 },
      { bin: "90-100", count: 2 },
    ],
  },
  studentTopics: [
    {
      studentId: "stu-001",
      studentName: "Батаа",
      topicStats: [
        { topicId: "t1", topicName: "Периметр", successRate: 0.8 },
        { topicId: "t2", topicName: "Талбай", successRate: 0.6 },
        { topicId: "t3", topicName: "Эзлэхүүн", successRate: 0.5 },
      ],
    },
    {
      studentId: "stu-002",
      studentName: "Цагаачин",
      topicStats: [
        { topicId: "t1", topicName: "Периметр", successRate: 0.9 },
        { topicId: "t2", topicName: "Талбай", successRate: 0.8 },
        { topicId: "t3", topicName: "Эзлэхүүн", successRate: 0.7 },
      ],
    },
    {
      studentId: "stu-003",
      studentName: "Соёлхүү",
      topicStats: [
        { topicId: "t1", topicName: "Периметр", successRate: 0.5 },
        { topicId: "t2", topicName: "Талбай", successRate: 0.3 },
        { topicId: "t3", topicName: "Эзлэхүүн", successRate: 0.2 },
      ],
    },
  ],
  problems: [
    {
      problemId: "p1",
      problemTitle: "Квадратын талбайг олох",
      topicId: "t2",
      topicName: "Талбай",
      totalAttempts: 28,
      successRate: 0.85,
      pointBiserial: 0.65,
      discrimination: "good",
      commonMistakes: [
        { optionId: "opt-a", optionText: "Оролцогч сонгосон сайл хариулт", selectionRate: 0.1 },
      ],
    },
    {
      problemId: "p2",
      problemTitle: "Эзлэхүүнийг тооцоолох",
      topicId: "t3",
      topicName: "Эзлэхүүн",
      totalAttempts: 28,
      successRate: 0.42,
      pointBiserial: 0.15,
      discrimination: "poor",
      commonMistakes: [
        { optionId: "opt-b", optionText: "Хөлрийн уртыг л нэмэх", selectionRate: 0.3 },
        { optionId: "opt-c", optionText: "Площадь гэж андуурах", selectionRate: 0.2 },
      ],
    },
  ],
};

export default function InsightsDashboard() {
  const searchParams = useSearchParams();
  const testId = searchParams.get("test");

  const [insights, setInsights] = useState<TestInsights | null>(MOCK_INSIGHTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) {
      setInsights(null);
      return;
    }

    // API байхүү хүүлэх үед (одоохондоо мокап ашигла)
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setInsights(MOCK_INSIGHTS);
      setLoading(false);
    }, 500);
  }, [testId]);

  if (!testId) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Шалгалт сонгоно уу"
          hint="Дүн шинжилгээ үзэхийн тулд шалгалт сонгоно уу"
        />
      </div>
    );
  }

  if (!insights) {
    return (
      <EmptyState
        title="Өгөгдөл байхгүй"
        hint="Энэ шалгалтын дүн шинжилгээ бэлдэгдээгүй байна"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Шалгалтын дүн тайлан */}
      <TestReportCard
        stats={insights.stats}
        testTitle={insights.testTitle}
        conductedAt={insights.conductedAt}
      />

      {/* Бодлогын чанар анхааруулга */}
      <DiscriminationAlert problems={insights.problems} />

      {/* Сэдвийн дулааны зураг */}
      <TopicHeatmap studentTopics={insights.studentTopics} />

      {/* Хамгийн хүнд/амархан */}
      <ProblematicProblems problems={insights.problems} />

      {/* Хамгийн олон андуурсан сонголт */}
      <TopMistakes problems={insights.problems} />
    </div>
  );
}
