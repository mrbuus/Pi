import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Шинэ Ирээдүйн Эзэд — ЭЕШ-ийн математик, нийгэм судлалын бэлтгэл",
  description:
    "Шинэ Ирээдүйн Эзэд сургалтын төвийн ЭЕШ-ийн математик болон нийгмийн ухааны бэлтгэл хөтөлбөр. Алдаа бүрээс чинь суралцаж, яг хэрэгтэй бодлогыг чинь олж өгдөг адаптив систем.",
  openGraph: {
    title: "Шинэ Ирээдүйн Эзэд — ЭЕШ-ийн математик, нийгэм судлалын бэлтгэл",
    description:
      "ЭЕШ-ийн математик болон нийгмийн ухааны бэлтгэлийг алдаа бүрээс чинь сурч, яг хэрэгтэй бодлогыг олж өгдөг адаптив системээр.",
    siteName: "Шинэ Ирээдүйн Эзэд",
    locale: "mn_MN",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

// Эхний зурагт "буруу" горим гялсхийж харагдахаас сэргийлэх blocking script.
// localStorage-с уншиж <html>-д data-theme-г эхний paint-аас ӨМНӨ тавина —
// React effect бол хэтэрхий оройтно (нэг frame гялсхийх болно).
const THEME_INIT_SCRIPT = `(function(){
  var root = document.documentElement;
  // "js" класс — JS ажиллаж байгаагийн тэмдэг. globals.css дахь .reveal
  // анимац зөвхөн энэ класстай үед агуулгыг нуудаг. JS унтраалттай эсвэл
  // энэ скрипт ажиллаагүй бол агуулга ХАРАГДСАН хэвээр үлдэнэ —
  // нүүр хуудас хоосон харагдах эрсдэлээс сэргийлнэ.
  root.classList.add("js");
  try {
    var KEY = "pi_theme";
    var stored = localStorage.getItem(KEY);
    // ӨГӨГДМӨЛ нь "light" — "system" БИШ. Хэрэглэгчийн үйлдлийн систем
    // харанхуй байсан ч манай сайт цайвраар нээгдэнэ. Шалтгаан: цайвар
    // дэвсгэр дээрх бараан текст нь математикийн жижиг тэмдэгт уншихад
    // хэмжигдэхүйц дээр бөгөөд энэ нь бүтээгдэхүүний үндсэн харагдац.
    // Хэрэглэгч толгой хэсгийн сэлгэгчээр харанхуй/систем рүү сольж болно.
    var theme = (stored === "light" || stored === "dark" || stored === "system") ? stored : "light";
    var resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = resolved;
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
