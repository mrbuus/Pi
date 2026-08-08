"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, SectionHeader } from "@/components/ui/Surface";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";

import { api } from "@/lib/api";
interface FinanceReport {
  period: string;
  income: {
    trainingFees: number;
    exams: number;
    books: number;
    other: number;
  };
  totalIncome: number;
  expenses: {
    salary: number;
    rent: number;
    utilities: number;
    marketing: number;
    materials: number;
    equipment: number;
    other: number;
  };
  totalExpenses: number;
  netProfit: number;
  previousNetProfit: number | null;
  profitChange: number | null;
  targetIncome: number | null;
  collectionRate: number | null;
}

interface ExpenseRecord {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  occurredOn: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

// Сарын утгаур 1
const MONTHS_MN = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("en-US")}₮`;
}

function parseYearMonth(dateStr: string): [number, number] {
  const [y, m] = dateStr.split("-");
  return [parseInt(y, 10), parseInt(m, 10)];
}

function getPrevMonth(yearMonth: string): string {
  const [year, month] = parseYearMonth(yearMonth);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

function getNextMonth(yearMonth: string): string {
  const [year, month] = parseYearMonth(yearMonth);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export default function FinanceDashboardClient() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState("");
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "SALARY",
    description: "",
    occurredOn: "",
  });

  // Одоогийн сарыг авах
  useEffect(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${now.getFullYear()}-${month}`);
  }, []);

  // Хэрэглэгчийн роль авах
  useEffect(() => {
    const getUser = async () => {
      try {
        // api() задалсан өгөгдлийг ШУУД буцаана — res.ok / res.json() байхгүй.
        const me = await api<{ role: string }>("/auth/me");
        setUserRole(me.role);
      } catch {
        // Ignore
      }
    };
    getUser();
  }, []);

  // Тайлан авах
  useEffect(() => {
    if (!currentMonth) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportRes, expensesRes] = await Promise.all([
          api<FinanceReport>(`/finance/report?month=${currentMonth}`),
          api<ExpenseRecord[]>(`/finance/expenses?month=${currentMonth}`),
        ]);

        // api() алдаа гарвал өөрөө throw хийнэ (монгол мессежтэй) —
        // res.ok шалгах шаардлагагүй.
        setReport(reportRes);
        setExpenses(expensesRes);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Алдаа гарсан байна"
        );
        setReport(null);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(getPrevMonth(currentMonth));
  };

  const handleNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth));
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expenseForm.amount || !expenseForm.occurredOn) {
      alert("Дүн, ангилал, огноо заавал бөглөнө");
      return;
    }

    if (userRole !== "ADMIN") {
      alert("Зөвхөн админ л зарлага нэмэх боломжтой");
      return;
    }

    try {
      await api("/finance/expenses", {
        method: "POST",
        body: {
          amount: parseInt(expenseForm.amount, 10),
          category: expenseForm.category,
          description: expenseForm.description || undefined,
          occurredOn: expenseForm.occurredOn,
        },
      });

      setExpenseForm({
        amount: "",
        category: "SALARY",
        description: "",
        occurredOn: "",
      });
      setShowAddExpense(false);

      // Дахин авах
      if (currentMonth) {
        setExpenses(await api<ExpenseRecord[]>(`/finance/expenses?month=${currentMonth}`));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Алдаа гарсан байна");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-4">
        <EmptyState
          title="Өгөгдөл байхгүй"
          hint="Энэ сарын төлбөр эсвэл зарлага олдохгүй байна."
        />
      </div>
    );
  }

  const [year, month] = parseYearMonth(currentMonth);
  const monthName = MONTHS_MN[month - 1];

  return (
    <div className="space-y-6 p-4">
      {/* Сарын сонгогч */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handlePrevMonth}
          aria-label="Өмнөх сар"
          className="px-3 py-2 rounded border border-line hover:bg-bg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="text-center font-semibold text-lg">
          {monthName} {year}
        </div>
        <button
          onClick={handleNextMonth}
          aria-label="Дараагийн сар"
          className="px-3 py-2 rounded border border-line hover:bg-bg transition-colors"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* ОРлогоны задаргаа */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold text-lg mb-3">Орлого</h2>
          <div className="grid gap-3">
            <IncomeRow
              label="Сургалтын төлбөр"
              amount={report.income.trainingFees}
            />
            <IncomeRow label="Шалгалтын төлбөр" amount={report.income.exams} />
            <IncomeRow label="Номын төлбөр" amount={report.income.books} />
            <IncomeRow label="Бусад" amount={report.income.other} />
            <div className="border-t border-current/10 pt-3 font-semibold flex justify-between">
              <span>Нийт орлого</span>
              <span>{formatCurrency(report.totalIncome)}</span>
            </div>
          </div>
        </div>

        {/* Орлогоны график (CSS bar chart) */}
        <IncomeChart income={report.income} total={report.totalIncome} />
      </Card>

      {/* Зарлагын задаргаа */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold text-lg mb-3">Зарлага</h2>
          <div className="grid gap-3">
            <ExpenseRow label="Цалин" amount={report.expenses.salary} />
            <ExpenseRow label="Ааш" amount={report.expenses.rent} />
            <ExpenseRow label="Коммунал" amount={report.expenses.utilities} />
            <ExpenseRow label="Сурталчилга" amount={report.expenses.marketing} />
            <ExpenseRow label="Материал" amount={report.expenses.materials} />
            <ExpenseRow label="Тоног төхөөрөмж" amount={report.expenses.equipment} />
            <ExpenseRow label="Бусад" amount={report.expenses.other} />
            <div className="border-t border-current/10 pt-3 font-semibold flex justify-between">
              <span>Нийт зарлага</span>
              <span>{formatCurrency(report.totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* Зарлагын график */}
        <ExpenseChart expenses={report.expenses} total={report.totalExpenses} />
      </Card>

      {/* Цэвэр ашиг */}
      <Card className="space-y-3">
        <h2 className="font-semibold text-lg">Цэвэр ашиг</h2>
        <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
          {formatCurrency(report.netProfit)}
        </div>

        {report.profitChange !== null && report.previousNetProfit !== null && (
          <div className="text-sm text-current/60">
            Өмнөх сартай харьцуулалт:{" "}
            <span
              className={
                report.profitChange > 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {report.profitChange > 0 ? "+" : ""}
              {formatCurrency(report.profitChange)}
            </span>
          </div>
        )}
      </Card>

      {/* Зарлагын бүртгэл */}
      {userRole === "ADMIN" && (
        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Зарлагын бүртгэл</h2>
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="px-3 py-1 text-sm rounded bg-current/10 hover:bg-current/20 transition-colors"
            >
              {showAddExpense ? "Хаах" : "Нэмэх"}
            </button>
          </div>

          {showAddExpense && (
            <form onSubmit={handleAddExpense} className="space-y-3 p-3 rounded bg-current/5">
              <div>
                <label className="text-sm font-medium">Дүн (₮)</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  className="w-full mt-1 px-2 py-1 border border-line rounded"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Ангилал</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  className="w-full mt-1 px-2 py-1 border border-line rounded"
                >
                  <option value="SALARY">Цалин</option>
                  <option value="RENT">Ааш</option>
                  <option value="UTILITIES">Коммунал</option>
                  <option value="MARKETING">Сурталчилга</option>
                  <option value="MATERIALS">Материал</option>
                  <option value="EQUIPMENT">Тоног төхөөрөмж</option>
                  <option value="OTHER">Бусад</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Огноо</label>
                <input
                  type="date"
                  value={expenseForm.occurredOn}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      occurredOn: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-2 py-1 border border-line rounded"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Тайлбар</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-2 py-1 border border-line rounded"
                  placeholder="Сонголтой"
                />
              </div>

              <button
                type="submit"
                className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Нэмэх
              </button>
            </form>
          )}

          {expenses.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-2 rounded bg-current/5 text-sm space-y-1"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{exp.category}</span>
                    <span className="font-semibold">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>
                  {exp.description && (
                    <div className="text-current/60">{exp.description}</div>
                  )}
                  <div className="text-xs text-current/40">
                    {new Date(exp.occurredOn).toLocaleDateString("mn-MN")} — {" "}
                    {exp.createdBy.firstName} {exp.createdBy.lastName}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-current/60 text-center py-4">
              Энэ сарын зарлага байхгүй
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function IncomeRow({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-current/70">{label}</span>
      <span className="font-medium">{formatCurrency(amount)}</span>
    </div>
  );
}

function ExpenseRow({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-current/70">{label}</span>
      <span className="font-medium">{formatCurrency(amount)}</span>
    </div>
  );
}

function IncomeChart({
  income,
  total,
}: {
  income: { trainingFees: number; exams: number; books: number; other: number };
  total: number;
}) {
  if (total === 0) return null;

  const items = [
    { label: "Сургалт", value: income.trainingFees, color: "bg-blue-600" },
    { label: "Шалгалт", value: income.exams, color: "bg-emerald-600" },
    { label: "Ном", value: income.books, color: "bg-amber-600" },
    { label: "Бусад", value: income.other, color: "bg-slate-600" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {items
          .filter((i) => i.value > 0)
          .map((item) => (
            <div key={item.label} className="flex items-center gap-1 text-xs">
              <div className={`w-3 h-3 rounded-sm ${item.color}`} />
              <span>{item.label}</span>
            </div>
          ))}
      </div>
      <div className="flex gap-1 h-8 rounded overflow-hidden bg-current/5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} opacity-70`}
            style={{ flex: total > 0 ? item.value / total : 0 }}
          />
        ))}
      </div>
    </div>
  );
}

function ExpenseChart({
  expenses,
  total,
}: {
  expenses: {
    salary: number;
    rent: number;
    utilities: number;
    marketing: number;
    materials: number;
    equipment: number;
    other: number;
  };
  total: number;
}) {
  if (total === 0) return null;

  const items = [
    { label: "Цалин", value: expenses.salary, color: "bg-red-600" },
    { label: "Ааш", value: expenses.rent, color: "bg-orange-600" },
    { label: "Коммунал", value: expenses.utilities, color: "bg-yellow-600" },
    { label: "Сурт.", value: expenses.marketing, color: "bg-purple-600" },
    { label: "Материал", value: expenses.materials, color: "bg-pink-600" },
    { label: "Тоног", value: expenses.equipment, color: "bg-cyan-600" },
    { label: "Бусад", value: expenses.other, color: "bg-slate-600" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {items
          .filter((i) => i.value > 0)
          .map((item) => (
            <div key={item.label} className="flex items-center gap-1 text-xs">
              <div className={`w-3 h-3 rounded-sm ${item.color}`} />
              <span>{item.label}</span>
            </div>
          ))}
      </div>
      <div className="flex gap-1 h-8 rounded overflow-hidden bg-current/5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} opacity-70`}
            style={{ flex: total > 0 ? item.value / total : 0 }}
          />
        ))}
      </div>
    </div>
  );
}
