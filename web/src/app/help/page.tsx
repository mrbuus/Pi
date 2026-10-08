import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CentreHelp from "@/components/support/CentreHelp";
export default function HelpPage() {
  return <main className="min-h-screen bg-bg px-5 py-8 sm:py-12"><nav className="mx-auto mb-8 flex max-w-2xl items-center justify-between gap-3" aria-label="Туслах навигаци"><Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft aria-hidden className="h-4 w-4" />Үндсэн нүүр</Link><Link href="/login" className="inline-flex min-h-11 items-center text-sm text-brand">Нэвтрэх</Link></nav><CentreHelp /></main>;
}
