import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/support_models.dart';
import '../data/support_repository.dart';
import '../domain/feedback_form.dart';
import 'support_icons.dart';

final myFeedbackProvider = FutureProvider.autoDispose<FeedbackPage>(
  (ref) => ref.watch(supportRepositoryProvider).myFeedback(),
);

/// Санал, асуулт, алдаа (`/app/feedback`, вэбийн `FeedbackWorkspace`): шинэ хүсэлт + түүх.
/// Зураг хавсаргах нь `core/files` байршуулалт бэлэн болмогц нэмэгдэнэ.
class FeedbackScreen extends ConsumerStatefulWidget {
  const FeedbackScreen({super.key});

  @override
  ConsumerState<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends ConsumerState<FeedbackScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subject = TextEditingController();
  final _body = TextEditingController();
  final _requestId = FeedbackRequestId();
  FeedbackKind _kind = FeedbackKind.bug;
  bool _sending = false;
  String? _message;
  bool _failed = false;

  @override
  void dispose() {
    _subject.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_sending || !(_formKey.currentState?.validate() ?? false)) return;
    final subject = _subject.text.trim();
    final body = _body.text.trim();
    final id = _requestId.forPayload('${_kind.api}\n$subject\n$body');
    setState(() {
      _sending = true;
      _message = null;
    });
    try {
      final saved = await ref
          .read(supportRepositoryProvider)
          .send(clientRequestId: id, kind: _kind.api, subject: subject, body: body);
      if (!mounted) return;
      _requestId.reset();
      _subject.clear();
      _body.clear();
      setState(() {
        _failed = false;
        _message = 'Хүсэлт хадгалагдлаа. Хариуг доорх түүхээс харна.';
      });
      ref.invalidate(myFeedbackProvider);
      _showTicket(saved);
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _message = e.kind == ApiErrorKind.badRequest || e.kind == ApiErrorKind.conflict
            ? e.message
            : 'Хүсэлт илгээгдсэн нь баталгаажсангүй. Бичсэн мэдээлэл хэвээр байгаа тул дахин оролдоно уу.';
      });
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _showTicket(FeedbackTicket t) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(t.subject, style: ctx.text.titleLarge),
              Meta(items: [FeedbackKind.fromApi(t.kind).label, feedbackStateLabel(t.state), _date(t.createdAt)]),
              const SizedBox(height: AppSpace.md),
              Text(t.body, style: ctx.text.bodyMedium),
              const SizedBox(height: AppSpace.lg),
              Text('Хариу', style: ctx.text.titleSmall),
              Text(
                t.response?.trim().isNotEmpty ?? false ? t.response! : 'Хариу хараахан ирээгүй байна.',
                style: ctx.text.bodyMedium?.copyWith(color: ctx.colors.inkDim),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final history = ref.watch(myFeedbackProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Санал, асуулт, алдаа')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
        children: [
          AppCard(
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Шинэ хүсэлт', style: context.text.titleMedium),
                  const SizedBox(height: AppSpace.md),
                  Wrap(
                    spacing: AppSpace.sm,
                    runSpacing: AppSpace.sm,
                    children: [
                      for (final k in FeedbackKind.values)
                        ChoiceChip(
                          avatar: Icon(_kindIcon(k), size: 16),
                          label: Text(k.label),
                          selected: _kind == k,
                          onSelected: _sending ? null : (_) => setState(() => _kind = k),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.md),
                  TextFormField(
                    controller: _subject,
                    enabled: !_sending,
                    maxLength: 120,
                    decoration: const InputDecoration(labelText: 'Гарчиг'),
                    validator: (v) => validateSubject(v ?? ''),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  TextFormField(
                    controller: _body,
                    enabled: !_sending,
                    minLines: 4,
                    maxLines: 8,
                    maxLength: 10000,
                    decoration: const InputDecoration(
                      labelText: 'Дэлгэрэнгүй',
                      hintText: 'Юу хийхэд ямар асуудал гарсан, эсвэл ямар саналтай байгаагаа бичээрэй.',
                      alignLabelWithHint: true,
                    ),
                    validator: (v) => validateBody(v ?? ''),
                  ),
                  const SizedBox(height: AppSpace.md),
                  FilledButton.icon(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(SupportIcons.send, size: 18),
                    label: Text(_sending ? 'Илгээж байна' : 'Хүсэлт илгээх'),
                  ),
                  if (_message != null) ...[
                    const SizedBox(height: AppSpace.sm),
                    Semantics(
                      liveRegion: true,
                      child: Text(
                        _message!,
                        style: context.text.bodyMedium?.copyWith(color: _failed ? context.colors.error : context.colors.ink),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SectionHeader(title: 'Хүсэлтийн түүх'),
          history.when(
            skipLoadingOnRefresh: false,
            loading: () => const SkeletonPulse(child: SkeletonCard(lines: 3)),
            error: (e, _) => SizedBox(
              height: 260,
              child: ErrorState(
                message: e is ApiError ? e.message : AppStrings.genericError,
                onRetry: () => ref.invalidate(myFeedbackProvider),
              ),
            ),
            data: (page) => page.items.isEmpty
                ? const AppCard(
                    child: SizedBox(
                      height: 200,
                      child: EmptyState(
                        icon: SupportIcons.feedback,
                        title: 'Хүсэлт хараахан алга',
                        message: 'Илгээсэн хүсэлт, түүний хариу энд харагдана.',
                      ),
                    ),
                  )
                : AppCard(
                    padding: EdgeInsets.zero,
                    child: Column(
                      children: [
                        for (var i = 0; i < page.items.length; i++) ...[
                          if (i > 0) Divider(height: 1, color: context.colors.line),
                          ListTile(
                            leading: Icon(_kindIcon(FeedbackKind.fromApi(page.items[i].kind))),
                            title: Text(page.items[i].subject),
                            subtitle: Meta(
                              items: [feedbackStateLabel(page.items[i].state), _date(page.items[i].createdAt)],
                            ),
                            trailing: Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
                            onTap: () => _showTicket(page.items[i]),
                          ),
                        ],
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

IconData _kindIcon(FeedbackKind k) => switch (k) {
      FeedbackKind.bug => SupportIcons.bug,
      FeedbackKind.suggestion => SupportIcons.suggestion,
      FeedbackKind.question => SupportIcons.question,
    };

String _date(String iso) {
  final t = parseApiInstant(iso);
  return t == null ? '' : DateMn.numeric(UbDateTime.fromInstant(t));
}
