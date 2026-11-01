import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import '../../app/redirect.dart';
import 'ui/consent_screen.dart';
import 'ui/deletion_request_screen.dart';
import 'ui/forgot_password_screen.dart';
import 'ui/login_screen.dart';
import 'ui/profile_screen.dart';

/// `auth` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - public: `/login`, `/forgot-password` (`#t=<токен>` — имэйлийн холбоос). `/register` апп-д хийгдээгүй
///   (эзний шийдвэр) — router-ийн «удахгүй» дэлгэц вэбээр нээнэ.
/// - shell: `/app/profile`, `/app/profile/deletion-request`, `/app/password`.
/// - fullscreen: `/app/consent` (вэбийн адил шалгалт унтраалттай — `consentGateEnabled`).
final authRoutes = FeatureRoutes(
  public: [
    GoRoute(
      path: '/login',
      builder: (context, state) => LoginScreen(
        next: safeNext(state.uri.queryParameters['next']),
        message: state.extra is String ? state.extra! as String : null,
      ),
    ),
    GoRoute(
      path: '/forgot-password',
      builder: (context, state) => ForgotPasswordScreen(linkToken: linkTokenFromFragment(state.uri.fragment)),
    ),
  ],
  shell: [
    GoRoute(path: '/app/profile', builder: (_, _) => const ProfileScreen()),
    GoRoute(path: deletionRequestPath, builder: (_, _) => const DeletionRequestScreen()),
    GoRoute(path: '/app/password', builder: (_, _) => const ChangePasswordScreen()),
  ],
  fullscreen: [
    GoRoute(path: '/app/consent', builder: (_, _) => const ConsentScreen()),
  ],
);
