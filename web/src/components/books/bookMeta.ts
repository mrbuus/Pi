// Нийтийн номын нэршил, хавтас (эзэн 2026-10-11: «Математикийн тестүүд I, II, III», 100x100 гэж бичихгүй).
// ӨС-ийн Book.code → харагдах нэр. Хавтасны зураг зөвхөн 100×100-д бий (web/public/home).
export interface BookMeta {
  name: string;
  sub: string;
  short?: string;
  art: "grid" | "tri" | "circ" | "cube" | "pi" | "sum";
  color: string;
  color2: string;
  cover?: string;
  back?: string;
  spine?: string;
  order: number;
  /** Нүүр хуудасны цилиндр дэх товч тайлбар */
  blurb?: string;
}

export const BOOK_META: Record<string, BookMeta> = {
  "100V3": { name: "Математикийн тестүүд I", sub: "12 бүлэг сэдэв", short: "Тестүүд I", art: "grid", color: "#1E3263", color2: "#122142", cover: "/home/100x100-front.jpg", back: "/home/100x100-back.jpg", spine: "/home/100x100-spine.jpg", order: 1, blurb: "Тоо тоололоос логарифм хүртэл 12 сэдэв, тест бүр A/B хувилбартай" },
  "200V3": { name: "Математикийн тестүүд II", sub: "Функц, уламжлал, интеграл", short: "Тестүүд II", art: "grid", color: "#243C73", color2: "#152647", order: 2, blurb: "Функцээс дифференциал тэгшитгэл хүртэл 19 сэдэв" },
  "300": { name: "Математикийн тестүүд III", sub: "Прогресс, вектор, магадлал", short: "Тестүүд III", art: "grid", color: "#2A4680", color2: "#17294D", order: 3, blurb: "Аналитик геометр, матриц, комплекс тоо, өгөгдлийн шинжилгээ" },
  "1000": { name: "1000 бодлого", sub: "ЭЕШ-ийн загвартай сорилууд", short: "1000 бодлого", art: "sum", color: "#1C2F5E", color2: "#0F1D3D", order: 4, blurb: "Шалгалтын бүтэцтэй 40 бодлогын сорилууд" },
  HG1: { name: "Хавтгайн геометр 1", sub: "Планиметр", short: "Планиметр I", art: "tri", color: "#213A6E", color2: "#132548", order: 5, blurb: "Гурвалжин, тойрог, тэдгээрийн шинж чанар" },
  HAV: { name: "Хавтгайн геометр", sub: "Планиметр I, II", short: "Планиметр", art: "tri", color: "#213A6E", color2: "#132548", order: 5, blurb: "Гурвалжин, тойрог, олон өнцөгт, талбай" },
  OGT: { name: "Огторгуйн геометр", sub: "Стереометр", short: "Стереометр", art: "cube", color: "#1F3669", color2: "#112244", order: 6, blurb: "Огторгуйн биет, огтлол, эзлэхүүн" },
  PI: { name: "π тест", sub: "Давтлагын тест", short: "π тест", art: "pi", color: "#263F74", color2: "#14264B", order: 7, blurb: "Шалгалтын бүтэцтэй давтлагын тест" },
};

export const bookName = (code: string, dbTitle: string) => BOOK_META[code]?.name ?? dbTitle;
