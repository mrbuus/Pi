import '../../app/feature_routes.dart';

/// `scan` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// Төлөвлөсөн замууд (вэбийн замтай ижил) — shell: /app/scan/:code; fullscreen: /app/scan (камер).
/// Бүртгээгүй `/app/...` замд shell автоматаар «удахгүй» дэлгэц (PendingScreen) харуулна.
const scanRoutes = FeatureRoutes();
