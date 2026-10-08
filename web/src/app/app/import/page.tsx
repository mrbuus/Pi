import type { Metadata } from "next";
import WordImportClient from "@/components/document-import/WordImportClient";
export const metadata: Metadata = { title: "Word бодлого оруулах — Pi.mn" };
export default function WordImportPage() {
  return <WordImportClient />;
}
