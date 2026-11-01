import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_extras.dart';
import '../data/teacher_repository.dart';
import 'teacher_icons.dart';

/// «Хэн засаж байна» (`POST /presence`, түлхүүр `attendance:<ангийн id>:<өдөр>`). 45 сек тутам цохилно,
/// апп ар талд орвол зогсоно, гарахдаа `leave: true`. Алдаа гарвал чимээгүй (зөвхөн мэдээллийн зурвас).
class PresenceBeat extends ConsumerStatefulWidget {
  const PresenceBeat({super.key, required this.classId, required this.date, this.interval = const Duration(seconds: 45)});

  final String classId;
  final String date;
  final Duration interval;

  @override
  ConsumerState<PresenceBeat> createState() => _PresenceBeatState();
}

class _PresenceBeatState extends ConsumerState<PresenceBeat> {
  late final TeacherRepository _repo = ref.read(teacherRepositoryProvider);
  late final AppLifecycleListener _life;
  late final bool _enabled = ref.read(presenceEnabledProvider);
  Timer? _timer;
  List<PresenceEditor> _others = const [];

  String get _key => 'attendance:${widget.classId}:${widget.date}';

  @override
  void initState() {
    super.initState();
    _life = AppLifecycleListener(onResume: _start, onInactive: _stop);
    if (_enabled) _start();
  }

  void _start() {
    if (!_enabled) return;
    _timer?.cancel();
    unawaited(_beat());
    _timer = Timer.periodic(widget.interval, (_) => unawaited(_beat()));
  }

  void _stop() {
    _timer?.cancel();
    _timer = null;
    unawaited(_repo.presence(_key, leave: true).then<void>((_) {}, onError: (_) {}));
  }

  Future<void> _beat() async {
    try {
      final others = await _repo.presence(_key);
      if (mounted) setState(() => _others = others);
    } catch (_) {
      // Presence нь нэмэлт мэдээлэл — алдаа ирцийн тэмдэглэгээнд саад болохгүй.
    }
  }

  @override
  void dispose() {
    _life.dispose();
    if (_timer != null) _stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_others.isEmpty) return const SizedBox.shrink();
    final names = _others.map((e) => e.name).join(', ');
    final c = context.colors;
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: AppSpace.sm),
        color: c.surfaceSunken,
        child: Row(
          children: [
            Icon(TeacherIcons.editors, size: 16, color: c.inkDim),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: Text(
                '$names мөн энэ ангийг тэмдэглэж байна',
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
