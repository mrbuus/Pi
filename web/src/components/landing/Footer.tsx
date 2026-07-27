import LogoMark from "@/components/LogoMark";
import { BRANCHES, ORG, PHONES } from "@/lib/orgInfo";

// Instagram холбоос orgInfo.ts-д хараахан алга (ORG нь энэ ажлын хамрах
// хүрээнээс гадуурх файл) тул энд шууд бичсэн. Дараа нь orgInfo.ts-д
// нэгтгэвэл энэ мөрийг устгаад ORG.instagram ашиглана.
const INSTAGRAM_URL = "https://www.instagram.com/shineireedui_official";

export default function Footer() {
  // Энэ хөл bg-brand-navy өвлөгөө өнгөтэй бөгөөд ХОЁУЛАН theme-д харанхуй хэвээр
  // үлддэг (лого, hero band, footer шиг). Тиймээс доtorх text-white/xx
  // тэмдэглэгээнүүд зөв — theme-д хамааралтай text-on-* токен шаардлагагүй.
  return (
    <footer className="border-t border-line bg-brand-navy py-14 text-white/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:grid-cols-3">
        <div>
          {/* Лого нь навигаци өнгөтэй (цайвар дэвсгэр дээр зориулагдсан) тул
              харанхуй хөл дээр цайвар жижиг таб дотор харуулна */}
          <span className="inline-flex rounded-lg bg-white p-1.5">
            <LogoMark size={26} />
          </span>
          <p className="mt-3 text-sm leading-relaxed">{ORG.name}</p>
          <p className="mt-1 text-sm">{ORG.slogan}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
            <a
              href={ORG.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-white/90 hover:underline"
            >
              Facebook хуудас →
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-white/90 hover:underline"
            >
              Instagram хуудас →
            </a>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">
            Холбоо барих
          </p>
          <div className="mt-3 grid gap-1 text-sm">
            {PHONES.map((phone) => (
              <a
                key={phone}
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="hover:underline"
              >
                {phone}
              </a>
            ))}
          </div>
          <a
            href={`mailto:${ORG.email}`}
            className="mt-2 inline-block text-sm hover:underline"
          >
            {ORG.email}
          </a>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/50">
            Салбарууд
          </p>
          <div className="mt-3 grid gap-3">
            {BRANCHES.map((b) => (
              <div key={b.id} className="text-sm">
                <p className="font-semibold text-white/90">{b.label}</p>
                {/* selectable — хаяг хуулагдах ёстой */}
                <p className="selectable mt-0.5 text-white/60">{b.address}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 px-5 pt-6 text-xs text-white/50">
        © 2026 {ORG.name}
      </div>
    </footer>
  );
}
