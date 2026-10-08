import type { Metadata } from "next";
import ConsentPage from "@/components/consent/ConsentPage";
export const metadata: Metadata = { title: "Миний зөвшөөрөл | Pi.mn" };
export default function Page() {
  return <ConsentPage />;
}
