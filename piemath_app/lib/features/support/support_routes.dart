import '../../app/feature_routes.dart';

/// `support` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// Төлөвлөсөн замууд (вэбийн замтай ижил) — shell: /app/support, /app/feedback, /app/tools.
/// Бүртгээгүй `/app/...` замд shell автоматаар «удахгүй» дэлгэц (PendingScreen) харуулна.
const supportRoutes = FeatureRoutes();
