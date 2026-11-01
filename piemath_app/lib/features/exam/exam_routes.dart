import '../../app/feature_routes.dart';

/// `exam` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// Төлөвлөсөн замууд (вэбийн замтай ижил) — shell: /app/tests, /app/tests/:id/result, /app/tests/:id/review; fullscreen: /app/tests/:id.
/// Бүртгээгүй `/app/...` замд shell автоматаар «удахгүй» дэлгэц (PendingScreen) харуулна.
const examRoutes = FeatureRoutes();
