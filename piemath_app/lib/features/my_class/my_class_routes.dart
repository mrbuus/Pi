import '../../app/feature_routes.dart';

/// `my_class` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// Төлөвлөсөн замууд (вэбийн замтай ижил) — shell: /app/my-class, /app/my-class/tests/:testId, /app/makeup.
/// Бүртгээгүй `/app/...` замд shell автоматаар «удахгүй» дэлгэц (PendingScreen) харуулна.
const myClassRoutes = FeatureRoutes();
