import '../../app/feature_routes.dart';

/// `parent` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// Төлөвлөсөн замууд (вэбийн замтай ижил) — shell: /app/parent, /app/parent/weekly, /app/dismissal.
/// Бүртгээгүй `/app/...` замд shell автоматаар «удахгүй» дэлгэц (PendingScreen) харуулна.
const parentRoutes = FeatureRoutes();
