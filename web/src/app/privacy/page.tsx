import type { Metadata } from "next";
import LegalPage from "@/components/consent/LegalPage";
export const metadata: Metadata = { title: "Нууцлалын бодлого | Pi.mn" };
export default function Page() {
  return <LegalPage kind="privacy" />;
}
