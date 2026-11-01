import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import '../../app/redirect.dart';
import 'ui/login_screen.dart';

/// `auth` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// Төлөвлөсөн замууд — public: /login, /forgot-password, /register; shell: /app/profile, /app/password;
/// fullscreen: /app/consent.
final authRoutes = FeatureRoutes(
  public: [
    GoRoute(
      path: '/login',
      builder: (context, state) => LoginScreen(
        next: safeNext(state.uri.queryParameters['next']),
        message: state.extra is String ? state.extra! as String : null,
      ),
    ),
  ],
);
