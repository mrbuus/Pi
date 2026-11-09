import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/shell/app_shell.dart';
import '../../core/ui/ui.dart';
import '../payments/domain/org_info.dart';
import 'legal_content.dart';

/// `/privacy`, `/terms` — бодлогын бичвэрийг апп дотор харуулна (вэб рүү хөтлөхгүй).
/// Нэвтрэлтгүй ч нээгдэнэ (бүртгүүлэх, зөвшөөрөл өгөх үед).
class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.kind});

  final LegalKind kind;

  @override
  Widget build(BuildContext context) {
    final other = kind == LegalKind.privacy ? LegalKind.terms : LegalKind.privacy;
    final dim = context.text.bodySmall?.copyWith(color: context.colors.inkDim);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: Text(kind.title)),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
          children: [
            AppCard(
              accent: context.colors.info,
              child: Row(
                children: [
                  Icon(AppIcons.info, size: 18, color: context.colors.info),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(child: Text(legalDraftNotice, style: context.text.titleSmall)),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            Text(legalVersionNote, style: dim),
            for (final s in legalSections(kind)) ...[
              SectionHeader(title: s.title),
              Text(s.text, style: context.text.bodyMedium?.copyWith(height: 1.5)),
            ],
            const SectionHeader(title: 'Холбоо барих'),
            Text(OrgInfo.centerName, style: context.text.bodyMedium),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                icon: const Icon(AppIcons.mail, size: 18),
                label: const Text(OrgInfo.email),
                onPressed: () => launchUrl(Uri.parse('mailto:${OrgInfo.email}')),
              ),
            ),
            const SizedBox(height: AppSpace.md),
            Text(legalSourceNote, style: dim),
            const SizedBox(height: AppSpace.lg),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: OutlinedButton.icon(
                icon: const Icon(AppIcons.document, size: 18),
                label: Text(other.title),
                onPressed: () => context.pushReplacement(other.path),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
