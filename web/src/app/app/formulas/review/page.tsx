import type { Metadata } from "next";
import ReviewClient from "@/components/formulas/review/ReviewClient";
export const metadata: Metadata = {
  title: "Томьёо цээжлэх — Pi.mn",
  description: "Томьёогоо зайтай давталт, дасгалаар бататгаарай.",
};
export default function ReviewPage() {
  return <ReviewClient />;
}
