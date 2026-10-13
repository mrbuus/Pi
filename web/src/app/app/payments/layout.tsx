import RequireRole from "@/components/nav/RequireRole";

// Төлбөрийн хэсэг — Багш+ ба Админ (сервер дээр finance.manage шалгана)
export default function PaymentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>{children}</RequireRole>;
}
