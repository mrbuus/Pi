import type { IconName } from "./icons";
import { SMS_ENABLED } from "@/lib/features";

export interface NavLink {
  href: string;
  label: string;
  icon: IconName;
  /** Мөрийн баруун талын тоо — "makeup" = components/makeup/MakeupNavBadge (нөхөөгүй хичээл) */
  badge?: "makeup";
}

export type GroupKey = "learn" | "class" | "finance" | "admin" | "internal" | "personal";

// Бүлгийн монгол шошго — эзний хүсэлтээр чиг үүргээр нь бүлэглэсэн.
export const GROUP_LABEL: Record<GroupKey, string> = {
  learn: "Сургалт",
  class: "Анги",
  finance: "Төлбөр",
  admin: "Удирдлага",
  internal: "Дотоод",
  personal: "Хувийн",
};

export const GROUP_ICON: Record<GroupKey, IconName> = {
  learn: "book-open",
  class: "calendar",
  finance: "wallet",
  admin: "shield",
  internal: "pencil",
  personal: "user",
};

// Бүлэг бүрийн өнгө (шинэ дизайн, 2026-09-26 — «өнгөлөг, урам өгөх»).
// Зөвхөн дүрсний дэвсгэрт хэрэглэнэ; шошго нь ink хэвээр тул уншигдац буурахгүй.
// Tailwind-ийн бүрэн анги нэрээр бичсэн (динамик залгавал purge хийгдэнэ).
export const GROUP_TONE: Record<GroupKey | "home", string> = {
  home: "bg-brand-bright/15 text-brand-soft",
  learn: "bg-accent-teal/15 text-accent-teal",
  class: "bg-accent-violet/15 text-accent-violet",
  finance: "bg-success/15 text-success",
  admin: "bg-brand-bright/15 text-brand-soft",
  internal: "bg-accent-sky/15 text-accent-sky",
  personal: "bg-accent-sky/15 text-accent-sky",
};

// Role бүрийн НҮҮР (dashboard) холбоос — самбарын дээд хэсэгт бүлэглэлгүй,
// тод байдлаар харагдана.
export const HOME: Record<string, NavLink> = {
  GROUP_TEACHER: { href: "/app/groups", label: "Анги удирдах", icon: "users" },
  STUDENT: { href: "/app/student", label: "Миний самбар", icon: "home" },
  TEACHER: { href: "/app/teacher", label: "Багшийн самбар", icon: "home" },
  TEACHER_PLUS: { href: "/app/teacher", label: "Багшийн самбар", icon: "home" },
  ADMIN: { href: "/app/admin", label: "Удирдлага", icon: "home" },
  BUYER: { href: "/app/buyer", label: "Миний эрхүүд", icon: "home" },
  PARENT: { href: "/app/parent", label: "Хүүхдийн явц", icon: "home" },
};

// Бодит маршрутуудыг эрх, чиг үүргээр бүлэглэсэн бүрэн цэс.
// Ажилтны «Хуваарь» хэсэг: Хуваарь + Төлөвлөгч табууд (nav/ClassHubTabs.tsx;
// эзэн 2026-10-08, 2026-10-18-нд бусад табыг хассан).
// Хэрэглэгдэхүүн: график, дүрс, биет, томьёо, бодогч, тор цаас (бүх role)
const TOOLS_LINK: NavLink = { href: "/app/tools", label: "Хэрэглэгдэхүүн", icon: "shapes" };

const NAV_BY_ROLE: Record<string, NavLink[]> = {
  GROUP_TEACHER: [
    HOME.GROUP_TEACHER,
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Бодолтын бичлэг", icon: "play-circle" },
    { href: "/app/store", label: "Дэлгүүр", icon: "store" },
    TOOLS_LINK,
  ],
  STUDENT: [
    HOME.STUDENT,
    { href: "/app/results-ranking", label: "Миний дүн, байр", icon: "chart" },
    { href: "/app/lesson-flow/my", label: "Өдрийн хичээл", icon: "calendar" },
    // Тасалсан/хоцорсон өдрийн хичээлээ нөхөх + онолын зураг (эзэн 2026-10-18)
    { href: "/app/makeup", label: "Нөхөх хичээл", icon: "list-checks", badge: "makeup" },
    { href: "/app/study", label: "Суралцах", icon: "book-open" },
    { href: "/app/study/history", label: "Давтлагын түүх", icon: "clock" },
    { href: "/app/learn", label: "Хичээл үзэх", icon: "book-open" },
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    { href: "/app/goals", label: "Миний зорилго", icon: "target" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    { href: "/app/student/payments", label: "Миний төлбөр", icon: "credit-card" },
    { href: "/app/practice", label: "Дасгал", icon: "practice" },
    { href: "/app/store", label: "Дэлгүүр", icon: "store" },
    TOOLS_LINK,
  ],
  TEACHER: [
    HOME.TEACHER,
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    // Багш бүх анги, сурагчийг Багш+-тай адил ХАРНА (эзэн 2026-10-22); төлбөр, удирдлага нээгдэхгүй
    { href: "/app/classes", label: "Ангиуд", icon: "school" },
    { href: "/app/admin/students", label: "Сурагчид", icon: "users" },
    { href: "/app/admin/theory", label: "Онолын агуулга", icon: "file-text" },
    TOOLS_LINK,
  ],
  TEACHER_PLUS: [
    HOME.TEACHER_PLUS,
    { href: "/app/internal", label: "Бодлогын ноорог", icon: "pencil" },
    { href: "/app/import", label: "Word импорт", icon: "file-text" },
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    { href: "/app/payments", label: "Төлбөр", icon: "credit-card" },
    // Хүсэлтүүд + Элсэлтийн удирдлага → нэг «Элсэлт», дотор нь табтай (эзэн 2026-10-13)
    { href: "/app/admin/leads", label: "Элсэлт", icon: "user-plus" },
    { href: "/app/admin/sorils", label: "Жишиг сорил", icon: "clipboard-list" },
    { href: "/app/admin/reconcile", label: "Банкны тулгалт", icon: "building" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    { href: "/app/admin/theory", label: "Онолын агуулга", icon: "file-text" },
    { href: "/app/admin/students", label: "Сурагчид", icon: "users" },
    { href: "/app/admin/analytics", label: "Аналитик", icon: "bar-chart" },
    { href: "/app/sms", label: "Дугаарлуу мессеж", icon: "message-square" },
    { href: "/app/classes", label: "Ангиуд", icon: "school" },
    { href: "/app/admin/store", label: "Дэлгүүрийн удирдлага", icon: "store" },
    TOOLS_LINK,
  ],
  ADMIN: [
    HOME.ADMIN,
    { href: "/app/admin/v2", label: "v2 ажлын хяналт", icon: "clipboard-list" },
    { href: "/app/admin/capabilities", label: "Эрхийн матриц", icon: "shield-check" },
    { href: "/app/internal", label: "Бодлогын ноорог", icon: "pencil" },
    { href: "/app/import", label: "Word импорт", icon: "file-text" },
    { href: "/app/teacher", label: "Багшийн самбар", icon: "teacher" },
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    // Хүсэлтүүд + Элсэлтийн удирдлага → нэг «Элсэлт», дотор нь табтай (эзэн 2026-10-13)
    { href: "/app/admin/leads", label: "Элсэлт", icon: "user-plus" },
    { href: "/app/admin/sorils", label: "Жишиг сорил", icon: "clipboard-list" },
    { href: "/app/admin/reconcile", label: "Банкны тулгалт", icon: "building" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    { href: "/app/admin/theory", label: "Онолын агуулга", icon: "file-text" },
    { href: "/app/admin/students", label: "Сурагчид", icon: "users" },
    { href: "/app/admin/audit", label: "Аудит", icon: "shield-check" },
    { href: "/app/admin/analytics", label: "Аналитик", icon: "bar-chart" },
    { href: "/app/sms", label: "Дугаарлуу мессеж", icon: "message-square" },
    { href: "/app/classes", label: "Ангиуд", icon: "school" },
    { href: "/app/admin/finance", label: "Санхүү", icon: "wallet" },
    { href: "/app/admin/passes", label: "Эрхийн удирдлага", icon: "key" },
    { href: "/app/admin/store", label: "Дэлгүүрийн удирдлага", icon: "store" },
    TOOLS_LINK,
  ],
  BUYER: [
    HOME.BUYER,
    { href: "/app/results-ranking", label: "Миний дүн, байр", icon: "chart" },
    { href: "/app/study", label: "Суралцах", icon: "book-open" },
    { href: "/app/study/history", label: "Давтлагын түүх", icon: "clock" },
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    // Худалдаж авсан шалгалт (1000 бодлого орно) — «Шалгалт» хэсэгт
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    { href: "/app/store", label: "Дэлгүүр", icon: "store" },
    TOOLS_LINK,
  ],
  PARENT: [
    HOME.PARENT,
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
  ],
};

// Маршрут бүрийг аль бүлэгт харьяалагдахыг тодорхойлно (нүүр хуудсуудаас бусад).
const ITEM_GROUP: Record<string, GroupKey> = {
  "/app/internal": "internal",
  "/app/study/history": "learn",
  "/app/groups": "class",
  "/app/study": "learn",
  "/app/results-ranking": "learn",
  "/app/admin/v2": "admin",
  "/app/admin/capabilities": "admin",
  "/app/import": "internal",
  "/app/support": "personal",
  "/app/feedback": "personal",
  "/app/dismissal": "class",
  "/app/lesson-flow": "class",
  "/app/lesson-flow/my": "class",
  "/app/makeup": "class",
  "/app/admin/classrooms": "admin",
  // «Анги» самбар (эзэн 2026-10-13); бүртгэлийн удирдлага /app/admin/classrooms хэвээр
  "/app/classes": "class",
  "/app/admin/finance": "finance",
  "/app/admin/passes": "admin",
  "/app/notifications": "personal",
  "/app/consent": "personal",
  "/app/admin/store": "finance",
  "/app/tuition": "finance",
  "/app/insights": "class",
  "/app/practice": "learn",
  "/app/store": "personal",

  "/app/tools": "learn",
  "/app/learn": "learn",
  "/app/library": "learn",
  "/app/videos": "learn",
  "/app/tests": "learn",
  "/app/teacher": "class",
  "/app/schedule": "class",
  "/app/planner": "class",
  "/app/teacher-hours": "class",
  "/app/admin/leads": "admin",
  "/app/admin/sorils": "admin",
  "/app/admin/enrollment": "admin",
  "/app/admin/reconcile": "finance",
  "/app/admin/theory": "internal",
  "/app/admin/students": "admin",
  "/app/admin/audit": "admin",
  "/app/admin/analytics": "admin",
  "/app/payments": "finance",
  "/app/sms": "admin",
  "/app/goals": "personal",
  "/app/student/payments": "personal",
};

// Role-ийн онцгой бүлэглэл: энгийн Багшид «Сурагчид» ганцаараа «Удирдлага» бүлэгт
// орох нь төөрөгдүүлэх тул «Анги» бүлэгт (Багш+/Админд ITEM_GROUP хэвээр).
const ITEM_GROUP_BY_ROLE: Partial<Record<string, Record<string, GroupKey>>> = {
  TEACHER: { "/app/admin/students": "class" },
};

// Өмнө нь "Нууц үг солих" тусдаа, гарцаагүй тод цэсийн зүйл байсан — эзний
// хүсэлтээр /app/profile дотор нэг хэсэг болгон шилжүүлж, оронд нь энд зөвхөн
// "Миний мэдээлэл"-руу орох ганц холбоос үлдээв. Role бүрт нийтлэг тул
// автоматаар Хувийн бүлэгт нэмэгдэнэ.
const PROFILE_LINK: NavLink = { href: "/app/profile", label: "Миний мэдээлэл", icon: "user" };
// Бүх role-д нийтлэг (Codex G27, G17): мэдэгдэл ба нууцлалын зөвшөөрөл.
const COMMON_PERSONAL: NavLink[] = [
  { href: "/app/support", label: "Тусламж", icon: "message-square" },
  { href: "/app/feedback", label: "Санал хүсэлт", icon: "file-text" },
  { href: "/app/notifications", label: "Мэдэгдэл", icon: "bell" },
  { href: "/app/consent", label: "Нууцлал, зөвшөөрөл", icon: "shield-check" },
];

// Гар утасны доод мөрөнд байнга харагдах гол цэс (нүүрний дараа, «Бусад»-аас өмнө).
// Бусад бүх холбоос «Бусад» дотор хэвээр — нэг ч цэс хасагдахгүй.
const PRIMARY_BY_ROLE: Record<string, string[]> = {
  GROUP_TEACHER: ["/app/library", "/app/videos"],
  STUDENT: ["/app/learn", "/app/tests", "/app/schedule"],
  TEACHER: ["/app/schedule", "/app/library", "/app/tests"],
  TEACHER_PLUS: ["/app/schedule", "/app/payments", "/app/admin/students"],
  ADMIN: ["/app/admin/students", "/app/admin/leads", "/app/schedule"],
  BUYER: ["/app/library", "/app/videos", "/app/schedule"],
  PARENT: ["/app/schedule"],
};

// Доод мөрөнд харуулах богино шошго (урт нэр 375px-т багтахгүй).
const SHORT_LABEL: Record<string, string> = {
  "/app/learn": "Хичээл",
  "/app/library": "Сан",
  "/app/videos": "Видео",
  "/app/tests": "Шалгалт",
  "/app/schedule": "Хуваарь",
  "/app/payments": "Төлбөр",
  "/app/admin/students": "Сурагчид",
  "/app/admin/leads": "Элсэлт",
};

export interface BottomTab extends NavLink {
  short: string;
}

export function getBottomTabs(role: string | null): BottomTab[] {
  if (!role) return [];
  const items = NAV_BY_ROLE[role] ?? [];
  const home = items[0];
  const primary = (PRIMARY_BY_ROLE[role] ?? [])
    .map((href) => items.find((i) => i.href === href))
    .filter((i): i is NavLink => !!i);
  const tabs: BottomTab[] = [];
  if (home) tabs.push({ ...home, short: "Нүүр" });
  for (const item of primary) tabs.push({ ...item, short: SHORT_LABEL[item.href] ?? item.label });
  return tabs;
}

export interface NavGroup {
  key: GroupKey;
  label: string;
  icon: IconName;
  items: NavLink[];
}

export interface RoleNav {
  home: NavLink | null;
  groups: NavGroup[];
}

const GROUP_ORDER: GroupKey[] = ["learn", "class", "finance", "admin", "internal", "personal"];
// Ажилтанд «Анги» хамгийн дээр (эзэн 2026-10-18: «Анги нь Сургалтаас дээр байх»)
const STAFF_GROUP_ORDER: GroupKey[] = ["class", "learn", "finance", "admin", "internal", "personal"];
const STAFF_ROLES = new Set(["ADMIN", "TEACHER_PLUS", "TEACHER"]);

export function getRoleNav(role: string | null): RoleNav {
  const items = (role ? NAV_BY_ROLE[role] ?? [] : []).filter((i) => SMS_ENABLED || i.href !== "/app/sms");
  const home = items[0] ?? null;
  const rest = items.slice(1);

  const buckets: Record<GroupKey, NavLink[]> = {
    learn: [],
    class: [],
    finance: [],
    admin: [],
    internal: [],
    personal: [],
  };
  for (const item of rest) {
    const group = (role ? ITEM_GROUP_BY_ROLE[role]?.[item.href] : undefined) ?? ITEM_GROUP[item.href] ?? "learn";
    buckets[group].push(item);
  }
  // Миний мэдээлэл, тусламж, мэдэгдэл… баруун дээд булангийн хэрэглэгчийн цэст
  // (nav/UserMenu.tsx) шилжсэн — зүүн цэсэнд давхардуулахгүй (эзэн 2026-10-13).

  const order = role && STAFF_ROLES.has(role) ? STAFF_GROUP_ORDER : GROUP_ORDER;
  const groups = order.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: GROUP_LABEL[key],
    icon: GROUP_ICON[key],
    items: buckets[key],
  }));

  return { home, groups };
}

// Дээд самбарт харуулах хуудасны гарчиг — идэвхтэй маршрутын шошгыг
// цэсний өгөгдлөөс олж ашиглана (шинэ мэдээлэл зохиохгүй).
// «Анги» хэсэгт нэгтгэгдсэн хуудсуудын гарчиг (цэснээс хасагдсан тул энд).
const HUB_TITLE: Record<string, string> = {
  "/app/classes": "Ангиуд",
  "/app/lesson-flow": "Өдрийн хичээл",
  "/app/dismissal": "Анги тарах цаг",
  "/app/teacher-hours": "Хуваарийн цаг",
  "/app/planner": "Төлөвлөгч",
  "/app/insights": "Дүн шинжилгээ",
  "/app/admin/enrollment": "Элсэлтийн удирдлага",
};

export const PERSONAL_LINKS: NavLink[] = [PROFILE_LINK, ...COMMON_PERSONAL];

export function getPageTitle(role: string | null, pathname: string): string {
  const personal = PERSONAL_LINKS.find((l) => l.href === pathname);
  if (personal) return personal.label;
  if (HUB_TITLE[pathname] && role && ["ADMIN", "TEACHER_PLUS", "TEACHER"].includes(role)) return HUB_TITLE[pathname];
  const { home, groups } = getRoleNav(role);
  if (home?.href === pathname) return home.label;
  for (const group of groups) {
    const hit = group.items.find((item) => item.href === pathname);
    if (hit) return hit.label;
  }
  return "";
}
