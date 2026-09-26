import type { Metadata } from "next";
import PreviewCatalog from "@/components/preview/PreviewCatalog";
export const metadata: Metadata = {
  title: "Номыг урьдчилан үзэх | Pi.mn",
  description: "Бүлэг бүрийн эхний гурван бодлогын нөхцөлийг үнэгүй уншаарай.",
};
export default function Page() {
  return <PreviewCatalog />;
}
