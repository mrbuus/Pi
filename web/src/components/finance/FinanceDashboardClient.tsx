"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Surface";
import { ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { SkeletonCard } from "@/components/ui/Skeleton";
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

const EXPENSE_CATEGORIES = [
  ["SALARY", "Цалин"],
  ["RENT", "Түрээс"],
  ["UTILITIES", "Коммунал"],
  ["MARKETING", "Сурталчилгаа"],
  ["MATERIALS", "Материал"],
  ["EQUIPMENT", "Тоног төхөөрөмж"],
  ["OTHER", "Бусад"],
] as const;

function expenseCategoryLabel(category: string) {
  return (
    EXPENSE_CATEGORIES.find(([value]) => value === category)?.[1] ?? category
  );
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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(
    null,
  );
  const [deleteCandidate, setDeleteCandidate] = useState<ExpenseRecord | null>(
    null,
  );
  const [expenseActionBusy, setExpenseActionBusy] = useState(false);
  const [expenseActionError, setExpenseActionError] = useState<string | null>(
    null,
  );
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "SALARY",
    description: "",
    occurredOn: "",
  });

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
        setError(err instanceof Error ? err.message : "Алдаа гарсан байна");
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

  const refreshCurrentMonth = async () => {
    if (!currentMonth) return;
    const [reportResult, expensesResult] = await Promise.all([
      api<FinanceReport>(`/finance/report?month=${currentMonth}`),
      api<ExpenseRecord[]>(`/finance/expenses?month=${currentMonth}`),
    ]);
    setReport(reportResult);
    setExpenses(expensesResult);
  };

  const openEditExpense = (expense: ExpenseRecord) => {
    setExpenseActionError(null);
    setEditingExpense(expense);
    setExpenseForm({
      amount: String(expense.amount),
      category: expense.category,
      description: expense.description ?? "",
      occurredOn: expense.occurredOn.slice(0, 10),
    });
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      amount: "",
      category: "SALARY",
      description: "",
      occurredOn: "",
    });
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expenseForm.amount || !expenseForm.occurredOn) {
      setExpenseActionError("Дүн, ангилал, огноог бөглөнө үү.");
      return;
    }

    if (userRole !== "ADMIN") {
      setExpenseActionError("Зөвхөн админ зарлагыг удирдах боломжтой.");
      return;
    }

    const amount = Number(expenseForm.amount);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setExpenseActionError("Дүнг сөрөг биш бүхэл тоогоор оруулна уу.");
      return;
    }

    setExpenseActionBusy(true);
    setExpenseActionError(null);
    try {
      await api(
        editingExpense
          ? `/finance/expenses/${editingExpense.id}`
          : "/finance/expenses",
        {
          method: editingExpense ? "PATCH" : "POST",
          body: {
            amount,
            category: expenseForm.category,
            description: expenseForm.description,
            occurredOn: expenseForm.occurredOn,
          },
        },
      );
      resetExpenseForm();
      setEditingExpense(null);
      setShowAddExpense(false);
      await refreshCurrentMonth();
    } catch (err) {
      setExpenseActionError(
        err instanceof Error ? err.message : "Зарлагыг хадгалж чадсангүй.",
      );
    } finally {
      setExpenseActionBusy(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteCandidate || userRole !== "ADMIN") return;
    setExpenseActionBusy(true);
    setExpenseActionError(null);
    try {
      await api(`/finance/expenses/${deleteCandidate.id}`, {
        method: "DELETE",
      });
      setDeleteCandidate(null);
      await refreshCurrentMonth();
    } catch (err) {
      setExpenseActionError(
        err instanceof Error ? err.message : "Зарлагыг устгаж чадсангүй.",
      );
    } finally {
      setExpenseActionBusy(false);
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
            <ExpenseRow label="Түрээс" amount={report.expenses.rent} />
            <ExpenseRow label="Коммунал" amount={report.expenses.utilities} />
            <ExpenseRow
              label="Сурталчилгаа"
              amount={report.expenses.marketing}
            />
            <ExpenseRow label="Материал" amount={report.expenses.materials} />
            <ExpenseRow
              label="Тоног төхөөрөмж"
              amount={report.expenses.equipment}
            />
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
        <div
          className={`text-3xl font-bold ${report.netProfit > 0 ? "text-success" : report.netProfit < 0 ? "text-error" : "text-ink"}`}
        >
          {formatCurrency(report.netProfit)}
        </div>

        {report.profitChange !== null && report.previousNetProfit !== null && (
          <div className="text-sm text-current/60">
            Өмнөх сартай харьцуулалт:{" "}
            <span
              className={
                report.profitChange > 0 ? "text-success" : "text-error"
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
              onClick={() => {
                setExpenseActionError(null);
                setEditingExpense(null);
                resetExpenseForm();
                setShowAddExpense(!showAddExpense);
              }}
              className="min-h-11 px-4 rounded-lg bg-brand text-on-brand hover:bg-brand/90 transition-colors"
            >
              {showAddExpense ? "Хаах" : "Нэмэх"}
            </button>
          </div>

          {(showAddExpense || editingExpense) && (
            <form
              onSubmit={handleSaveExpense}
              className="space-y-3 rounded-xl border border-line bg-bg p-4"
            >
              <h3 className="font-semibold">
                {editingExpense ? "Зарлага засах" : "Шинэ зарлага"}
              </h3>
              <div>
                <label htmlFor="expense-amount" className="text-sm font-medium">
                  Дүн (₮)
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, amount: e.target.value })
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="expense-category"
                  className="text-sm font-medium"
                >
                  Ангилал
                </label>
                <select
                  id="expense-category"
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value })
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                >
                  {EXPENSE_CATEGORIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense-date" className="text-sm font-medium">
                  Огноо
                </label>
                <input
                  id="expense-date"
                  type="date"
                  value={expenseForm.occurredOn}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      occurredOn: e.target.value,
                    })
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="expense-description"
                  className="text-sm font-medium"
                >
                  Тайлбар
                </label>
                <input
                  id="expense-description"
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) =>
                    setExpenseForm({
                      ...expenseForm,
                      description: e.target.value,
                    })
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3"
                  placeholder="Сонголтой"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={expenseActionBusy}
                  className="min-h-11 rounded-lg bg-brand px-4 text-on-brand hover:bg-brand/90 disabled:opacity-60"
                >
                  {expenseActionBusy
                    ? "Хадгалж байна"
                    : editingExpense
                      ? "Өөрчлөлт хадгалах"
                      : "Зарлага нэмэх"}
                </button>
                {editingExpense && (
                  <button
                    type="button"
                    disabled={expenseActionBusy}
                    onClick={() => setEditingExpense(null)}
                    className="min-h-11 rounded-lg border border-line bg-surface px-4 hover:bg-bg"
                  >
                    Болих
                  </button>
                )}
              </div>
            </form>
          )}

          {expenseActionError && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
            >
              {expenseActionError}
            </div>
          )}

          {expenses.length > 0 ? (
            <div className="max-h-[32rem] space-y-2 overflow-y-auto">
              <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b border-line px-3 py-2 text-sm font-semibold text-ink-dim sm:grid">
                <span>Зарлагын мэдээлэл</span>
                <span>Огноо</span>
                <span>Дүн</span>
              </div>
              {expenses.map((exp) => (
                <article
                  key={exp.id}
                  className="grid gap-2 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {expenseCategoryLabel(exp.category)}
                    </div>
                    {exp.description && (
                      <p className="mt-1 break-words text-sm text-ink-dim">
                        {exp.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-dim">
                      Бүртгэсэн: {exp.createdBy.firstName}{" "}
                      {exp.createdBy.lastName}
                    </p>
                  </div>
                  <time className="text-sm text-ink-dim">
                    {new Date(exp.occurredOn).toLocaleDateString("mn-MN")}
                  </time>
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(exp.amount)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditExpense(exp)}
                        className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-bg"
                      >
                        Засах
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseActionError(null);
                          setDeleteCandidate(exp);
                        }}
                        className="min-h-11 rounded-lg border border-error/30 px-3 text-sm text-error hover:bg-error/10"
                      >
                        Устгах
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-dim">
              Энэ сарын зарлага байхгүй
            </div>
          )}
        </Card>
      )}

      {deleteCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !expenseActionBusy)
              setDeleteCandidate(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-expense-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-xl"
          >
            <h2 id="delete-expense-title" className="text-lg font-semibold">
              Энэ зарлагыг устгах уу?
            </h2>
            <div className="rounded-xl bg-bg p-4 text-sm">
              <p className="font-semibold">
                <Meta
                  items={[
                    formatCurrency(deleteCandidate.amount),
                    new Date(deleteCandidate.occurredOn).toLocaleDateString(
                      "mn-MN",
                    ),
                  ]}
                />
              </p>
              <p className="mt-1">
                {expenseCategoryLabel(deleteCandidate.category)}
              </p>
              {deleteCandidate.description && (
                <p className="mt-1 text-ink-dim">
                  {deleteCandidate.description}
                </p>
              )}
            </div>
            <p className="text-sm text-ink-dim">
              Устгасны дараа энэ сарын тайлангийн нийлбэр шинэчлэгдэнэ.
            </p>
            {expenseActionError && (
              <div
                role="alert"
                className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
              >
                {expenseActionError}
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={expenseActionBusy}
                onClick={() => setDeleteCandidate(null)}
                className="min-h-11 rounded-lg border border-line px-4 hover:bg-bg disabled:opacity-60"
              >
                Болих
              </button>
              <button
                type="button"
                disabled={expenseActionBusy}
                onClick={() => void handleDeleteExpense()}
                className="min-h-11 rounded-lg bg-error px-4 font-medium text-on-error hover:bg-error/90 disabled:opacity-60"
              >
                {expenseActionBusy ? "Устгаж байна" : "Зарлагыг устгах"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function IncomeRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-current/70">{label}</span>
      <span className="font-medium">{formatCurrency(amount)}</span>
    </div>
  );
}

function ExpenseRow({ label, amount }: { label: string; amount: number }) {
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
    { label: "Сургалт", value: income.trainingFees, color: "bg-brand" },
    { label: "Шалгалт", value: income.exams, color: "bg-accent-teal" },
    { label: "Ном", value: income.books, color: "bg-accent-gold" },
    { label: "Бусад", value: income.other, color: "bg-ink-dim" },
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
    { label: "Цалин", value: expenses.salary, color: "bg-accent-rose" },
    { label: "Түрээс", value: expenses.rent, color: "bg-accent-gold" },
    { label: "Коммунал", value: expenses.utilities, color: "bg-accent-sky" },
    { label: "Сурталчилгаа", value: expenses.marketing, color: "bg-brand" },
    { label: "Материал", value: expenses.materials, color: "bg-accent-teal" },
    {
      label: "Тоног төхөөрөмж",
      value: expenses.equipment,
      color: "bg-accent-violet",
    },
    { label: "Бусад", value: expenses.other, color: "bg-ink-dim" },
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
