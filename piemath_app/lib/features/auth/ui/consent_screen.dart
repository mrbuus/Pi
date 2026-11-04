import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/auth_models.dart';
import '../data/auth_repository.dart';
import 'widgets/auth_widgets.dart';

/// Зөвшөөрлийн шалгалт апп-д хүчээр шилжүүлэх эсэх. Вэбд ч унтраалттай (`NEXT_PUBLIC_CONSENT_GATE`,
/// эзэн 2026-10-22) — хуудас зөвхөн «Бусад»-аас нээгдэнэ.
const consentGateEnabled = false;

final consentStatusProvider = FutureProvider.autoDispose<ConsentStatus>(
  (ref) => ref.watch(authRepositoryProvider).consentStatus(),
);

/// Насны ангилалын сонголтоос зөвшөөрөл бэлэн эсэх (вэбийн `consentReady`).
bool consentReady({required bool acceptTerms, required bool? isMinor, required bool guardianConsent}) =>
    acceptTerms && isMinor != null && (!isMinor || guardianConsent);

/// «Миний зөвшөөрөл» — үйлчилгээний нөхцөл, нууцлалын бодлого, насанд хүрээгүй бол эцэг эхийн зөвшөөрөл.
class ConsentScreen extends ConsumerWidget {
  const ConsentScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(consentStatusProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Миний зөвшөөрөл')),
      body: switch (status) {
        AsyncData(:final value) when !value.needsConsent => EmptyState(
            icon: AppIcons.success,
            title: 'Зөвшөөрөл бүртгэгдсэн',
            message: '${value.privacyVersion ?? value.currentVersion} хувилбарт өгсөн зөвшөөрөл хадгалагдсан',
          ),
        AsyncData(:final value) => _ConsentForm(status: value),
        AsyncError(:final error) => ErrorState(
            message: error is ApiError && !error.isNetwork ? error.message : 'Зөвшөөрлийн мэдээллийг авч чадсангүй',
            onRetry: () => ref.invalidate(consentStatusProvider),
          ),
        _ => const LoadingState(cards: 2),
      },
    );
  }
}

class _ConsentForm extends ConsumerStatefulWidget {
  const _ConsentForm({required this.status});

  final ConsentStatus status;

  @override
  ConsumerState<_ConsentForm> createState() => _ConsentFormState();
}

class _ConsentFormState extends ConsumerState<_ConsentForm> {
  bool _acceptTerms = false;
  bool? _isMinor;
  bool _guardian = false;
  bool _busy = false;
  String? _error;

  bool get _ready => consentReady(acceptTerms: _acceptTerms, isMinor: _isMinor, guardianConsent: _guardian);

  Future<void> _save() async {
    if (!_ready || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authRepositoryProvider).saveConsent(
            privacyVersion: widget.status.currentVersion,
            isMinor: _isMinor!,
            guardianConsent: _guardian,
          );
      ref.invalidate(consentStatusProvider);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _openWeb(String path) =>
      launchUrl(Uri.parse('${Env.webBaseUrl}$path'), mode: LaunchMode.externalApplication);

  @override
  Widget build(BuildContext context) {
    final link = context.text.bodyMedium?.copyWith(
      color: context.colors.brand,
      decoration: TextDecoration.underline,
      decorationColor: context.colors.brand,
    );
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        Text(
          'Таны хуучин бүртгэлийг хаахгүй. Бодлогыг уншаад зөвшөөрлөө өгөх боломжтой',
          style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
        ),
        const SectionHeader(title: 'Нөхцөл ба зөвшөөрөл'),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Бодлого нь хуульчаар хянуулах төсөл. Зөвшөөрөл бүрийг та өөрөө сонгоно',
                style: context.text.bodySmall,
              ),
              const SizedBox(height: AppSpace.md),
              _CheckRow(
                value: _acceptTerms,
                enabled: !_busy,
                onChanged: (v) => setState(() => _acceptTerms = v),
                semanticLabel: 'Үйлчилгээний нөхцөл, нууцлалын бодлогыг уншиж зөвшөөрч байна',
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'Үйлчилгээний нөхцөл',
                        style: link,
                        recognizer: TapGestureRecognizer()..onTap = () => _openWeb('/terms'),
                      ),
                      const TextSpan(text: ', '),
                      TextSpan(
                        text: 'нууцлалын бодлогыг',
                        style: link,
                        recognizer: TapGestureRecognizer()..onTap = () => _openWeb('/privacy'),
                      ),
                      const TextSpan(text: ' уншиж зөвшөөрч байна'),
                    ],
                  ),
                  style: context.text.bodyMedium,
                ),
              ),
              const SizedBox(height: AppSpace.lg),
              Text('Насны ангилал', style: context.text.labelLarge),
              const SizedBox(height: AppSpace.sm),
              SegmentedButton<bool>(
                emptySelectionAllowed: true,
                showSelectedIcon: true,
                segments: const [
                  ButtonSegment(value: true, label: Text('18 нас хүрээгүй')),
                  ButtonSegment(value: false, label: Text('18 ба түүнээс дээш')),
                ],
                selected: {?_isMinor},
                onSelectionChanged: _busy
                    ? null
                    : (s) => setState(() {
                          _isMinor = s.isEmpty ? null : s.first;
                          _guardian = false;
                        }),
              ),
              if (_isMinor ?? false) ...[
                const SizedBox(height: AppSpace.md),
                _CheckRow(
                  value: _guardian,
                  enabled: !_busy,
                  onChanged: (v) => setState(() => _guardian = v),
                  semanticLabel: 'Эцэг эх, хууль ёсны төлөөлөгчтэйгөө бодлогыг уншиж, зөвшөөрлийг нь авсан',
                  child: Text(
                    'Эцэг эх, хууль ёсны төлөөлөгчтэйгөө бодлогыг уншиж, зөвшөөрлийг нь авсан',
                    style: context.text.bodyMedium,
                  ),
                ),
                const SizedBox(height: AppSpace.xs),
                Text(
                  'Энэ нь таны мэдүүлэг. Төв шаардлагатай үед төлөөлөгчтэй холбогдон баталгаажуулна',
                  style: context.text.bodySmall,
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpace.md),
        FormMessage(message: _error),
        const SizedBox(height: AppSpace.lg),
        FilledButton(
          onPressed: _ready && !_busy ? _save : null,
          child: _busy ? const ButtonProgress() : const Text('Зөвшөөрч хадгалах'),
        ),
      ],
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({
    required this.value,
    required this.onChanged,
    required this.child,
    required this.semanticLabel,
    this.enabled = true,
  });

  final bool value;
  final ValueChanged<bool> onChanged;
  final Widget child;
  final String semanticLabel;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Checkbox(
          value: value,
          semanticLabel: semanticLabel,
          onChanged: enabled ? (v) => onChanged(v ?? false) : null,
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: enabled ? () => onChanged(!value) : null,
              child: child,
            ),
          ),
        ),
      ],
    );
  }
}
