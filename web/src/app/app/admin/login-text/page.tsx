import type { Metadata } from "next";
import LoginTextEditor from "@/components/auth/LoginTextEditor";

export const metadata: Metadata = {
  title: "Нэвтрэх хуудасны тайлбар | Шинэ Ирээдүйн Эзэд",
};

export default function LoginTextAdminPage() {
  return <LoginTextEditor />;
}
