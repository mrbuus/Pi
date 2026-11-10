import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../payments/domain/org_info.dart';
import '../data/support_models.dart';
import '../data/support_repository.dart';
import '../domain/help_links.dart';

/// Түргэн асуултууд — серверийн сэдэв ачаалагдаагүй үед (вэбийн `CentreHelp` `QUICK`).
const _quickQuestions = [
  'Гэрийн даалгаврын зураг яаж илгээх вэ?',
  'Онол, бодолтоо хаанаас үзэх вэ?',
  'Эцэг эх хүүхдийн явцыг яаж харах вэ?',
  'Танхимын ангид яаж бүртгүүлэх вэ?',
];

final helpTopicsProvider = FutureProvider.autoDispose<List<HelpTopic>>(
  (ref) => ref.watch(supportRepositoryProvider).topics(),
);

/// Төвийн туслах (`/app/support`): урьдчилан бичсэн хариултаас хайна — AI биш (апп LLM дуудахгүй).
class SupportScreen extends ConsumerStatefulWidget {
  const SupportScreen({super.key});

  @override
  ConsumerState<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends ConsumerState<SupportScreen> {
  final _question = TextEditingController();
  final _replies = <(String, HelpReply)>[];
  bool _pending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _question.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _question.dispose();
    super.dispose();
  }

  Future<void> _ask([String? value]) async {
    final q = (value ?? _question.text).trim();
    if (_pending || q.length < 2 || q.length > 400) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      final reply = await ref.read(supportRepositoryProvider).ask(q);
      if (!mounted) return;
      setState(() {
        _replies.add((q, reply));
        if (_replies.length > 10) _replies.removeAt(0);
        _question.clear();
      });
    } on ApiError catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Туслахтай холбогдож чадсангүй. Таны асуулт талбарт хэвээр байна. Дахин илгээнэ үү.';
        _question.text = q;
      });
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  /// Эх сурвалжийг апп дотор нээнэ (вэб рүү хөтлөхгүй).
  void _openSource(String target) => context.push(target);

  @override
  Widget build(BuildContext context) {
    final topics = ref.watch(helpTopicsProvider).value;
    final quick = topics == null || topics.isEmpty ? _quickQuestions : [for (final t in topics.take(6)) t.question];
    return Scaffold(
      appBar: AppBar(title: const Text('Төвийн туслах')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
        children: [
          Text(
            'Сургалт болон аппын хэрэглээний баталгаатай мэдээллийг олно. Хувийн дүн, төлбөр, нууц үг уншихгүй.',
            style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
          ),
          const SizedBox(height: AppSpace.lg),
          if (_replies.isEmpty)
            for (final q in quick)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: AppCard(
                  onTap: _pending ? null : () => _ask(q),
                  child: Text(q, style: context.text.bodyMedium),
                ),
              ),
          for (final (asked, reply) in _replies) ...[
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: Container(
                margin: const EdgeInsets.only(left: AppSpace.xxl, top: AppSpace.md, bottom: AppSpace.sm),
                padding: const EdgeInsets.all(AppSpace.md),
                decoration: BoxDecoration(
                  color: context.colors.surfaceSunken,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Text(asked, style: context.text.bodyMedium),
              ),
            ),
            if (reply.fallback != null)
              AppCard(
                child: Text(reply.fallback!, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
              ),
            for (var i = 0; i < reply.matches.length; i++)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm),
                child: AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (i > 0) Text('Холбоотой мэдээлэл', style: context.text.labelSmall),
                      Text(reply.matches[i].question, style: context.text.titleSmall),
                      const SizedBox(height: AppSpace.xs),
                      MathText(reply.matches[i].answer, style: context.text.bodyMedium),
                      if (reply.matches[i].source case final src? when supportSourceTarget(src.href) != null)
                        TextButton.icon(
                          onPressed: () => _openSource(supportSourceTarget(src.href)!),
                          icon: const Icon(AppIcons.theory, size: 18),
                          label: Text(reply.matches[i].source!.label),
                        ),
                    ],
                  ),
                ),
              ),
          ],
          const SizedBox(height: AppSpace.lg),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextField(
                  controller: _question,
                  minLines: 2,
                  maxLines: 4,
                  maxLength: 400,
                  decoration: const InputDecoration(
                    labelText: 'Асуултаа бичээрэй',
                    hintText: 'Жишээ нь: даалгаврынхаа зургийг хаана илгээх вэ?',
                  ),
                ),
                const SizedBox(height: AppSpace.sm),
                FilledButton.icon(
                  onPressed: _pending || _question.text.trim().length < 2 ? null : _ask,
                  icon: const Icon(AppIcons.send, size: 18),
                  label: Text(_pending ? 'Хайж байна' : 'Асуух'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: AppSpace.sm),
                  Semantics(
                    liveRegion: true,
                    child: Text(_error!, style: context.text.bodyMedium?.copyWith(color: context.colors.error)),
                  ),
                ],
                TextButton(onPressed: () => context.push('/app/feedback'), child: const Text('Санал хүсэлт өгөх')),
                TextButton(onPressed: () => context.push(centreInfoPath), child: const Text('Төвийн мэдээлэл, салбарууд')),
              ],
            ),
          ),
          const SectionHeader(title: 'Төвтэй холбогдох'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (final p in OrgInfo.phones)
                  ListTile(
                    leading: const Icon(AppIcons.phone),
                    title: Text(p),
                    onTap: () => launchUrl(Uri.parse('tel:${p.replaceAll(' ', '')}')),
                  ),
                ListTile(
                  leading: const Icon(AppIcons.mail),
                  title: const Text(OrgInfo.email),
                  onTap: () => launchUrl(Uri.parse('mailto:${OrgInfo.email}')),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.md),
          Text(
            'Нууц үг, банкны мэдээлэл эсвэл бусдын хувийн мэдээллийг асуултад бүү бичээрэй.',
            style: context.text.bodySmall,
          ),
        ],
      ),
    );
  }
}
