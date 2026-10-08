import type { Metadata } from "next";
import LegalPage from "@/components/consent/LegalPage";
export const metadata: Metadata = { title: "Үйлчилгээний нөхцөл | Pi.mn" };
export default function Page() {
  return <LegalPage kind="terms" />;
}
