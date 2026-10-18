import type { Metadata } from "next";
import ScheduleView from "@/components/demo/schedule/ScheduleView";
import DemoShell from "@/components/demo/shell/DemoShell";

export const metadata: Metadata = {
  title: "Хуваарь — демо",
  robots: { index: false, follow: false },
};

/** Нийтийн ДЕМО: нэвтрэлтгүй, зохиомол өгөгдөл, юу ч хадгалагдахгүй. Бүрхүүл нь жинхэнэ аппын дүрслэл */
export default function DemoSchedulePage() {
  return (
    <DemoShell active="schedule" title="Хуваарь">
      <ScheduleView />
    </DemoShell>
  );
}
