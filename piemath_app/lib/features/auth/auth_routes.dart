import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import '../../app/redirect.dart';
import '../legal/legal_content.dart';
import '../legal/legal_screen.dart';
import 'ui/consent_screen.dart';
import 'ui/deletion_request_screen.dart';
import 'ui/forgot_password_screen.dart';
import 'ui/login_screen.dart';
import 'ui/profile_screen.dart';
import 'ui/register_screen.dart';
import 'ui/teacher_register_screen.dart';

/// `auth` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - public: `/login`, `/forgot-password` (`#t=<токен>` — имэйлийн холбоос), `/register` (натив бүртгэл,
///   `extra: RegisterArgs` — Gmail тасалбар), `/teacher-register` (багшийн бүртгэл), `/privacy`, `/terms`
///   (бодлогын бичвэр апп дотор — `features/legal`). Апп вэб рүү хөтлөхгүй.
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
    GoRoute(
      path: '/register',
      builder: (context, state) =>
          RegisterScreen(googleTicket: state.extra is RegisterArgs ? (state.extra! as RegisterArgs).googleTicket : null),
    ),
    GoRoute(path: '/teacher-register', builder: (_, _) => const TeacherRegisterScreen()),
    GoRoute(path: LegalKind.privacy.path, builder: (_, _) => const LegalScreen(kind: LegalKind.privacy)),
    GoRoute(path: LegalKind.terms.path, builder: (_, _) => const LegalScreen(kind: LegalKind.terms)),
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
