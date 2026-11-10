import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../application/sms_send_controller.dart';
import '../data/sms_models.dart';
import '../data/sms_repository.dart';
import '../domain/sms_logic.dart';

/// «Илгээх» таб (зөвхөн Админ): дугаар гараар эсвэл ангиас, загвар, тооцоо → баталгаажуулалт → илгээх.
class SmsSendTab extends ConsumerStatefulWidget {
  const SmsSendTab({super.key});

  @override
  ConsumerState<SmsSendTab> createState() => _SmsSendTabState();
}

class _SmsSendTabState extends ConsumerState<SmsSendTab> with AutomaticKeepAliveClientMixin {
  final _recipients = TextEditingController();
  final _text = TextEditingController();
  bool _confirming = false;
  bool _loadingClasses = false;

  SmsSendController get _ctrl => ref.read(smsSendControllerProvider.notifier);

  // Таб солиход бичсэн мессеж алдагдахгүй.
  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _recipients.dispose();
    _text.dispose();
    super.dispose();
  }

  void _sync(TextEditingController c, String value) {
    if (c.text != value) c.value = TextEditingValue(text: value, selection: TextSelection.collapsed(offset: value.length));
  }

  Future<void> _pickTemplate() async {
    final List<SmsTemplate> templates;
    try {
      templates = await ref.read(smsTemplatesProvider.future);
    } catch (e) {
      if (mounted) _snack(e is ApiError ? e.message : 'Загвар ачаалж чадсангүй');
      return;
    }
    if (!mounted) return;
    if (templates.isEmpty) {
      _snack('Загвар алга, «Загвар» табаас нэмнэ');
      return;
    }
    final picked = await showSelectSheet<SmsTemplate>(
      context,
      title: 'Загвар сонгох',
      options: [for (final t in templates) SelectOption(t, t.name, subtitle: t.body)],
    );
    if (picked != null) _ctrl.setText(picked.value.body);
  }

  Future<void> _addFromClass() async {
    if (_loadingClasses) return;
    setState(() => _loadingClasses = true);
    final repo = ref.read(smsRepositoryProvider);
    List<SmsClassroom> classes;
    List<SmsStudentContact> students;
    try {
      classes = await repo.classrooms();
      students = await repo.students();
    } catch (e) {
      if (mounted) _snack(e is ApiError ? e.message : 'Ангийн жагсаалт ачаалж чадсангүй');
      return;
    } finally {
      if (mounted) setState(() => _loadingClasses = false);
    }
    if (!mounted) return;
    if (classes.isEmpty) {
      _snack('Анги алга');
      return;
    }
    final phones = await showFormSheet<List<String>>(
      context,
      title: 'Ангиас хүлээн авагч нэмэх',
      subtitle: 'Сонгосон ангийн идэвхтэй сурагчдын утас нэмэгдэнэ',
      submitLabel: 'Нэмэх',
      fields: [
        FormSelectField<String>(
          name: 'classroom',
          label: 'Анги',
          required: true,
          options: [for (final c in classes) SelectOption(c.id, c.name)],
        ),
        FormMultiSelectField<SmsAudience>(
          name: 'audience',
          label: 'Хэний утас',
          required: true,
          initial: const {SmsAudience.student},
          options: [for (final a in SmsAudience.values) SelectOption(a, a.label)],
        ),
      ],
      onSubmit: (v) async {
        final list = classPhones(students, v.get<String>('classroom')!, v.many<SmsAudience>('audience'));
        if (list.isEmpty) throw const ApiError(ApiErrorKind.badRequest, 'Энэ ангид сонгосон утас алга');
        return list;
      },
    );
    if (phones == null || !mounted) return;
    _ctrl.setRecipients(appendPhones(ref.read(smsSendControllerProvider).recipients, phones));
    _snack('${phones.length} дугаар нэмэгдлээ');
  }

  Future<void> _send() async {
    final s = ref.read(smsSendControllerProvider);
    if (_confirming || !s.canSend) return;
    _confirming = true;
    try {
      final ok = await confirmAction(
        context,
        title: s.isBulk ? 'Бөөн SMS илгээх үү' : 'SMS илгээх үү',
        message: s.confirmText,
        confirmLabel: 'Илгээх',
      );
      if (!ok || !mounted) return;
      await _ctrl.send();
    } finally {
      _confirming = false;
    }
  }

  void _snack(String text) => ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final s = ref.watch(smsSendControllerProvider);
    _sync(_recipients, s.recipients);
    _sync(_text, s.text);
    final p = s.preview;
    final phones = s.phones;
    return CustomScrollView(
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
          sliver: SliverList.list(
            children: [
              SectionHeader(
                title: 'Хүлээн авагч',
                trailing: TextButton.icon(
                  onPressed: s.sending || _loadingClasses ? null : _addFromClass,
                  icon: _loadingClasses
                      ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(AppIcons.classes, size: 18),
                  label: const Text('Ангиас нэмэх'),
                ),
              ),
              TextField(
                key: const ValueKey('sms-recipients'),
                controller: _recipients,
                enabled: !s.sending,
                minLines: 2,
                maxLines: 5,
                keyboardType: TextInputType.multiline,
                decoration: const InputDecoration(
                  labelText: 'Утасны дугаар',
                  hintText: 'Жишээ нь 99112233, 88112233',
                  helperText: 'Зай, таслалаар тусгаарлана',
                ),
                onChanged: _ctrl.setRecipients,
              ),
              if (phones.isNotEmpty) ...[
                const SizedBox(height: AppSpace.sm),
                Text(
                  phones.length > 1
                      ? 'Оруулсан дугаар ${phones.length}, давхардлыг сервер хасна'
                      : 'Оруулсан дугаар 1',
                  style: context.text.bodyMedium,
                ),
              ],
              SectionHeader(
                title: 'Мессеж',
                trailing: TextButton.icon(
                  onPressed: s.sending ? null : _pickTemplate,
                  icon: const Icon(AppIcons.document, size: 18),
                  label: const Text('Загвар'),
                ),
              ),
              TextField(
                key: const ValueKey('sms-text'),
                controller: _text,
                enabled: !s.sending,
                minLines: 4,
                maxLines: 8,
                maxLength: 1000,
                keyboardType: TextInputType.multiline,
                decoration: const InputDecoration(labelText: 'Илгээх бичвэр', hintText: 'Мессежээ бичнэ'),
                onChanged: _ctrl.setText,
              ),
              Meta(
                items: [
                  '${s.text.length} тэмдэгт',
                  p.encoding,
                  '${p.segments} хэсэг',
                  if (p.segments > 1) 'хэсэгт ${p.multipartLimit} нэгж',
                ],
              ),
              if (s.isBulk) ...[
                const SectionHeader(title: 'Өртгийн тооцоо'),
                _EstimateCard(state: s, onEstimate: _ctrl.fetchEstimate),
              ],
              if (s.error != null) ...[
                const SizedBox(height: AppSpace.lg),
                _Notice(text: s.error!, icon: AppIcons.error, color: context.colors.error),
              ],
              if (s.success != null) ...[
                const SizedBox(height: AppSpace.lg),
                _Notice(text: s.success!, icon: AppIcons.success, color: context.colors.success),
              ],
              const SizedBox(height: AppSpace.xl),
              if (phones.isNotEmpty && s.hasText)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.sm),
                  child: Text(
                    'SMS явуулсны дараа буцаах боломжгүй',
                    style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                  ),
                ),
              SizedBox(
                height: 52,
                child: FilledButton.icon(
                  key: const ValueKey('sms-send'),
                  onPressed: s.canSend && !_confirming ? _send : null,
                  icon: s.sending
                      ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(AppIcons.send, size: 18),
                  label: Text(
                    s.sending
                        ? 'Илгээж байна'
                        : s.pendingBatchId != null
                        ? 'Илгээлтийг эхлүүлэх'
                        : s.isBulk
                        ? 'Багц үүсгээд илгээх'
                        : 'SMS илгээх',
                  ),
                ),
              ),
              if (s.isBulk && !s.estimateIsCurrent && s.hasText)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpace.sm),
                  child: Text(
                    'Илгээхийн өмнө одоогийн дугаар, бичвэрээр тооцоо авна',
                    style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _EstimateCard extends StatelessWidget {
  const _EstimateCard({required this.state, required this.onEstimate});

  final SmsSendState state;
  final VoidCallback onEstimate;

  @override
  Widget build(BuildContext context) {
    final e = state.estimateIsCurrent ? state.estimate : null;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (e != null) ...[
            _Row('Илгээх дугаар', '${e.deduplicatedCount}', strong: true),
            if (e.excludedArchivedCount != null) _Row('Архивласан тул хасагдсан', '${e.excludedArchivedCount}'),
            _Row('Оруулсан дугаар', '${e.recipientCount}'),
            _Row('Нэг дугаарт хэсэг', e.segmentsPerRecipient == null ? '-' : _num(e.segmentsPerRecipient!)),
            _Row('Нийт SMS хэсэг', '${e.estimatedSegments}'),
            _Row('Ойролцоо өртөг', formatMnt(e.estimatedCost), strong: true),
            const SizedBox(height: AppSpace.md),
          ] else
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.md),
              child: Text(
                'Хэдэн хүнд, ямар өртөгтэй явахыг серверээс тооцоолно',
                style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
              ),
            ),
          SizedBox(
            height: 48,
            child: OutlinedButton.icon(
              key: const ValueKey('sms-estimate'),
              onPressed: state.canEstimate ? onEstimate : null,
              icon: state.estimating
                  ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(AppIcons.chart, size: 18),
              label: Text(state.estimating ? 'Тооцоолж байна' : (e == null ? 'Тооцоо авах' : 'Дахин тооцоолох')),
            ),
          ),
        ],
      ),
    );
  }

  static String _num(num v) => v == v.roundToDouble() ? '${v.round()}' : v.toStringAsFixed(1);
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.strong = false});

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
    child: Row(
      children: [
        Expanded(
          child: Text(label, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
        ),
        Text(value, style: strong ? context.text.titleSmall : context.text.bodyMedium),
      ],
    ),
  );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.text, required this.icon, required this.color});

  final String text;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: AppSpace.sm),
        Expanded(child: Text(text, style: context.text.bodyMedium)),
      ],
    ),
  );
}
