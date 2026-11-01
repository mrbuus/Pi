import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/ui/ui.dart';
import '../application/mistakes_controller.dart';
import '../data/mistake_models.dart';
import '../learning_icons.dart';
import 'inline_message.dart';
import 'mistake_detail.dart';

/// `/app/mistakes/today` — өнөөдрийн давтлага (дээд тал нь 5 бодлого): нэг нэгээр нь дахин бодно.
class MistakesTodayScreen extends ConsumerStatefulWidget {
  const MistakesTodayScreen({super.key});

  @override
  ConsumerState<MistakesTodayScreen> createState() => _MistakesTodayScreenState();
}

class _MistakesTodayScreenState extends ConsumerState<MistakesTodayScreen> {
  int _position = 0;
  bool _done = false;
  final _results = <String, RetryResult>{};
  final _updated = <String, Mistake>{};

  void _finish() {
    ref.invalidate(mistakesProvider);
    setState(() => _done = true);
  }

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(todayMistakesProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Өнөөдрийн давтлага')),
      body: today.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => ErrorState(
          title: 'Давтлага ачаалж чадсангүй',
          message: errorText(e),
          onRetry: () => ref.invalidate(todayMistakesProvider),
        ),
        data: (items) {
          if (items.isEmpty) {
            return const EmptyState(
              icon: LearningIcons.review,
              title: 'Өнөөдөр товлосон давтлага алга',
              message: 'Дэвтрийн бусад бодлогыг хүссэн үедээ дахин бодож болно',
            );
          }
          if (_done) return _Summary(total: _results.length, correct: _results.values.where((r) => r.correct).length);
          final item = _updated[items[_position].id] ?? items[_position];
          final answered = _results.containsKey(item.id);
          final last = _position + 1 == items.length;
          return Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(AppSpace.gutter),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('${_position + 1} / ${items.length}', style: context.text.labelLarge),
                      const SizedBox(height: AppSpace.md),
                      MistakeDetail(
                        key: ValueKey(item.id),
                        item: item,
                        sessionMode: true,
                        onChanged: (m) => setState(() => _updated[m.id] = m),
                        onRetried: (r) => setState(() => _results.putIfAbsent(item.id, () => r)),
                      ),
                    ],
                  ),
                ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.all(AppSpace.gutter),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: !answered
                          ? null
                          : last
                          ? _finish
                          : () => setState(() => _position++),
                      child: Text(last ? 'Дүнгээ харах' : 'Дараагийнх'),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.total, required this.correct});

  final int total;
  final int correct;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: AppIcons.success,
      title: '$total бодлогоос $correct-ийг зөв бодлоо',
      message: total - correct > 0
          ? 'Зөрүүтэй бодлогууд дэвтэрт үлдэнэ. Дараагийн давтлагаар бататгана уу'
          : 'Дараагийн өдөр дахин бататгана уу',
      action: FilledButton(
        onPressed: () => context.go('/app/mistakes'),
        child: const Text('Дэвтэр рүү буцах'),
      ),
    );
  }
}
