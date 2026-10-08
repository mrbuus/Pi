# UI kit (shadcn/ui загвар)

Эзний шийдвэр (2026-09-26): өөрсдөө зохиосон загварын оронд салбарын жишиг болсон
**shadcn/ui** (Radix UI + class-variance-authority + tailwind-merge) загварыг ашиглана.
Компонентууд эх кодоороо энд хуулагдсан (shadcn-ий зарчим) ба **зөвхөн манай
өнгөний токеныг** ашигладаг (`bg-brand-bright`, `text-ink`, `border-line` …).

| Файл | Юунд |
|---|---|
| `button.tsx` | Бүх товч. `variant`: default, secondary, outline, ghost, danger, link; `size`: sm, md, lg, icon |
| `card.tsx` | Карт (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter) |
| `badge.tsx` | Төлөвийн жижиг шошго (success, warning, danger, info, neutral, brand) |
| `progress.tsx` | Явцын мөр (Radix Progress) |
| `tabs.tsx` | Таб (Radix Tabs, гарын сумаар шилжинэ) |
| `drawer.tsx` | Утсан дээр доороос гарах, чирч хаадаг хуудас (vaul) |
| `toaster.tsx` | Мэдэгдэл (sonner) — `import { toast } from "sonner"` |

Шинэ UI бичихдээ эхлээд эндээс ашигла. Хуучин `components/ui/Button.tsx` нь
байхгүй токен (`bg-primary`) ашигладаг тул шинэ кодонд ХЭРЭГЛЭХГҮЙ.
