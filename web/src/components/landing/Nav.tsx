import LogoMark from "@/components/LogoMark";

const LINKS = [
  { href: "#subjects", label: "Хичээлүүд" },
  { href: "#achievements", label: "Амжилтууд" },
  { href: "#tuition", label: "Төлбөр" },
  { href: "#branches", label: "Салбар" },
];

export default function Nav() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-line bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <a href="#" className="flex items-center">
          <LogoMark variant="full" size={38} priority />
        </a>
        <div className="ml-auto hidden items-center gap-7 text-sm font-medium text-ink-dim md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition hover:text-ink">
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="/login"
          className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
        >
          Нэвтрэх
        </a>
        <a
          href="/register"
          className="rounded-full bg-brand-bright px-5 py-2 text-sm font-bold text-on-brand transition hover:opacity-90"
        >
          Бүртгүүлэх
        </a>
      </nav>
    </header>
  );
}
