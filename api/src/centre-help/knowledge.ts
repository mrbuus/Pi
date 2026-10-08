/** Public, authored knowledge only. No pupil, finance ledger or secret data. */
export const KNOWLEDGE_VERSION = '2026-10-07';
export interface CentreKnowledge {
  id: string;
  question: string;
  answer: string;
  terms: string[];
  source: { label: string; href: string };
}
export const CENTRE_KNOWLEDGE: CentreKnowledge[] = [
  { id: 'about', question: 'Төв ямар сургалттай вэ?', answer: 'Шинэ Ирээдүйн Эзэд сургалтын төв нь элсэлтийн шалгалтад бэлдэх болон математикийн хоцрогдол арилгах танхимын сургалттай. Өөрийн түвшин, хуваарьт тохирох ангийн мэдээллийг төвөөс авна.', terms: ['төв', 'сургалт', 'тухай', 'centre', 'about', 'surgalt'], source: { label: 'Төвийн танилцуулга', href: '/#centre-info' } },
  { id: 'location', question: 'Салбарууд хаана байдаг вэ?', answer: 'Баруун дөрвөн замын салбар: Барилгын политехник коллежийн хойно, Бунда-Рага улаан тоосгон байшингийн таван давхар. Зүүн дөрвөн замын салбар: Жуковын автобусны буудлын баруун талд, Жоби төвийн гуравдугаар давхар. Очихоосоо өмнө төвийн холбоо барих хэсгээс байршлаа лавлаарай.', terms: ['хаана', 'хаяг', 'салбар', 'байршил', 'address', 'location', 'haana', 'hayag'], source: { label: 'Салбарын хаяг', href: '/#branches' } },
  { id: 'contact', question: 'Төвтэй яаж холбогдох вэ?', answer: 'Нүүр хуудасны холбоо барих хэсэгт төвийн нийтэлсэн утас, имэйл, албан ёсны Facebook ба Instagram холбоос байна. Энэ туслах чат мессежийг ажилтанд автоматаар илгээхгүй.', terms: ['холбогдох', 'утас', 'имэйл', 'facebook', 'instagram', 'contact', 'holbogdoh', 'utas'], source: { label: 'Холбоо барих', href: '/#branches' } },
  { id: 'enrol', question: 'Танхимын ангид яаж бүртгүүлэх вэ?', answer: 'Элсэлтийн мэдээлэлтэй танилцаад бүртгүүлнэ. Түвшин тогтоох материал болон өөрийн бодолтын зургийг ажилтан шалгаж, тохирох анги ба ирэх цагийг тодруулна. Хүсэлт илгээх нь ангийн суудал шууд батлагдсан гэсэн үг биш.', terms: ['элсэх', 'элсэлт', 'бүртгүүлэх', 'бүртгэл', 'түвшин тогтоох', 'enrol', 'burtgel', 'elseh'], source: { label: 'Бүртгэл', href: '/register' } },
  { id: 'tuition', question: 'Төлбөрийн мэдээллийг хаанаас харах вэ?', answer: 'Нийтэлсэн сургалтын багцын мэдээллийг нүүр хуудасны төлбөрийн хэсгээс харна. Өөрийн төлбөр, хүчинтэй хугацааг нэвтэрсэн самбараасаа шалгана. Энэ чат хувийн төлбөрийн дүн, банкны хуулга үзэхгүй бөгөөд төлбөрийг батлахгүй.', terms: ['төлбөр', 'үнэ', 'багц', 'qpay', 'payment', 'tuition', 'tulbur', 'une'], source: { label: 'Төлбөрийн мэдээлэл', href: '/#tuition' } },
  { id: 'signin', question: 'Нэвтрэхэд асуудал гарвал яах вэ?', answer: 'Нэвтрэх хэсэгт бүртгэлтэй утас, имэйл эсвэл нэвтрэх нэрээ оруулна. Нууц үгээ мартсан бол сэргээх хэсгийг ашиглана. Нууц үг, нэг удаагийн кодыг энэ чатад бичих шаардлагагүй.', terms: ['нэвтрэх', 'нэвтрэлт', 'нууц үг', 'login', 'password', 'nevtreh'], source: { label: 'Нэвтрэх', href: '/login' } },
  { id: 'homework', question: 'Гэрийн даалгаврын зураг яаж илгээх вэ?', answer: 'Нэвтэрсний дараа өөрийн даалгаврыг нээж, дэвтэр эсвэл ном дээрх бодолтын зургаа сонгоод илгээнэ. Сонгосон файл бүрийн төлөвийг шалгаарай. Багшийн шалгасан үнэлгээ, буцаасан тайлбар болон дахин илгээлтийг даалгаврын түүхээс харна.', terms: ['гэрийн даалгавар', 'даалгавар', 'даалгавр', 'зураг илгээх', 'homework', 'daalgavar', 'zurag ilgeeh'], source: { label: 'Суралцах хэсэг', href: '/app/study' } },
  { id: 'theory', question: 'Онол, зураг, бодолтоо хаанаас үзэх вэ?', answer: 'Хичээл үзэх хэсгээс өөрийн эрхтэй сэдвийн онол, зураг, материалтай танилцана. Бодолт болон бичлэгийн харагдах байдал тухайн материалд байгаа эсэх, таны хандалтын эрхээс хамаарна. Байхгүй бодолтыг энэ чат зохиож өгөхгүй.', terms: ['онол', 'бодолт', 'бичлэг', 'видео', 'theory', 'solution', 'onol', 'bodolt'], source: { label: 'Хичээл үзэх', href: '/app/learn' } },
  { id: 'practice', question: 'Алдаагаа засаж, дахин давтах боломж бий юу?', answer: 'Суралцах хэсэг, алдааны дэвтэр, бодлогын сан болон шалгалтаар давтана. Анх тусламжгүй бодсон хариу ба бодолт харсны дараах засварыг ялгаж хадгална. Локал үүсгэгч нь шугаман, квадрат тэгшитгэл болон бутархайн баталгаажуулсан загваруудад ажиллана; бүх төрлийн бодлого боддог загвар биш.', terms: ['давтах', 'алдаа', 'дасгал', 'бодлого үүсгэх', 'practice', 'davtah', 'aldaa', 'generator'], source: { label: 'Суралцах', href: '/app/study' } },
  { id: 'parent', question: 'Эцэг эх хүүхдийн явцыг яаж харах вэ?', answer: 'Эцэг эхийн бүртгэлээр хүүхэдтэй холболт хүснэ. Холболт баталгаажсаны дараа тухайн хүүхдийн ирц, даалгавар, шалгалтын дүн болон жилийн түүхийг харна. Баталгаажаагүй холболт хүүхдийн сургалтын мэдээллийг нээхгүй.', terms: ['эцэг эх', 'хүүхдийн явц', 'ирц', 'түүх', 'parent', 'history', 'etseg eh'], source: { label: 'Эцэг эхийн самбар', href: '/app/parent' } },
  { id: 'feedback', question: 'Алдаа, санал хүсэлтээ яаж өгөх вэ?', answer: 'Нэвтэрсэн самбарын санал хүсэлтийн хэсэгт асуудлаа бичнэ. Өөрийн хүсэлтийн төлөв ба ажилтны хариуг дараа нь харж болно. Зураг хавсаргавал бусдын хувийн мэдээлэл, нууц үг, код, банкны мэдээллийг эхлээд далдлаарай.', terms: ['санал', 'хүсэлт', 'алдаа мэдээлэх', 'bug', 'feedback', 'sanal', 'huselt'], source: { label: 'Санал хүсэлт', href: '/app/feedback' } },
  { id: 'offline', question: 'Интернэтгүй үед ашиглаж болох уу?', answer: 'Өмнө нь төхөөрөмждөө нээж хадгалсан зарим томьёог интернэтгүй харж болно. Даалгавар илгээх, шалгалтын хариуг серверт хадгалах, төлбөр баталгаажуулахад холболт хэрэгтэй. Хадгалагдлаа гэсэн баталгааг харах хүртэл илгээлт амжилттай болсон гэж үзэхгүй.', terms: ['интернэтгүй', 'сүлжээ', 'тасарсан', 'offline', 'internetgui'], source: { label: 'Холболтын тусламж', href: '/offline' } },
];

export function normalizeQuery(input: string): string {
  return input.normalize('NFKC').toLocaleLowerCase('mn').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Rank authored topics; returned prose is NEVER synthesized from the question. */
export function retrieveKnowledge(query: string) {
  const normalized = normalizeQuery(query);
  const words = new Set(normalized.split(' ').filter((w) => w.length > 2));
  const ranked = CENTRE_KNOWLEDGE.map((item) => ({ item, score: item.terms.reduce((score, raw) => {
    const term = normalizeQuery(raw);
    if (normalized === term) return score + 10;
    if (term.includes(' ') && normalized.includes(term)) return score + 7;
    if (words.has(term)) return score + 4;
    if (term.length > 4 && [...words].some((word) => word.startsWith(term))) return score + 2;
    return score;
  }, 0) })).filter((entry) => entry.score >= 2).sort((a, b) => b.score - a.score);
  return ranked.slice(0, 3).map(({ item }) => item);
}
