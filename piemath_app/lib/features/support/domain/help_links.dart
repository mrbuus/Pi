import '../../../app/redirect.dart';

/// Төвийн мэдээллийн апп доторх хуудас (салбар, холбоо барих, танилцуулга).
const centreInfoPath = '/app/support/centre';

/// Туслахын хариуны эх сурвалжийн холбоосыг (`api/src/centre-help/knowledge.ts`-ийн `source.href`)
/// апп-ын зам болгоно. Вэб рүү ХЭЗЭЭ Ч хөтлөхгүй (эзэн 2026-11-10): апп-д тохирох хуудасгүй бол null
/// (товч харагдахгүй, хариуны бичвэр өөрөө хангалттай).
String? supportSourceTarget(String href) {
  final h = href.trim();
  if (h.startsWith('/app/')) return safeNext(h);
  // Нүүр хуудасны хэсгүүд (`/#branches`, `/#centre-info`, `/#tuition`) → төвийн мэдээлэл.
  if (h == '/' || h.startsWith('/#')) return centreInfoPath;
  return switch (h) {
    // Нэвтэрсэн хэрэглэгчид бүртгүүлэх хуудас хэрэггүй — элсэлтийн мэдээлэл төвөөс.
    '/register' => centreInfoPath,
    // Нэвтэрсэн хүнд «нэвтрэх» тусламж = нууц үгээ солих.
    '/login' || '/forgot-password' => '/app/password',
    '/books' || '/sorils' || '/placement' || '/privacy' || '/terms' => h,
    _ => null,
  };
}
