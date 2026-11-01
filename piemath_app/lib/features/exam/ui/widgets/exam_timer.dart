import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/ui/ui.dart';
import '../../domain/timer_format.dart';
import '../exam_icons.dart';

/// Үлдсэн хугацаа дуусахад ойртох үед (секунд) нуусан таймер өөрөө буцаж гарна.
const examTimerReturnSeconds = 300;

/// Шалгалтын таймер (UX-RESEARCH §7): жижиг, улаан биш `mm:ss`. Товшоод нууж болно — хугацаа
/// 5 минутаас доош орох үед нэг удаа хөнгөн haptic-тай буцаж гарна. Цохилт, анивчилт, дуу байхгүй.
/// 5 минутаас дотор нууж болохгүй (тэр үед хэрэгтэй). Цагийг сервер тоолно — энд зөвхөн харуулна.
class ExamTimer extends StatefulWidget {
  const ExamTimer({super.key, required this.remaining, this.returnAtSeconds = examTimerReturnSeconds});

  final ValueListenable<int?> remaining;
  final int returnAtSeconds;

  @override
  State<ExamTimer> createState() => _ExamTimerState();
}

class _ExamTimerState extends State<ExamTimer> {
  bool _hidden = false;

  @override
  void initState() {
    super.initState();
    widget.remaining.addListener(_onTick);
  }

  @override
  void didUpdateWidget(ExamTimer old) {
    super.didUpdateWidget(old);
    if (old.remaining != widget.remaining) {
      old.remaining.removeListener(_onTick);
      widget.remaining.addListener(_onTick);
    }
  }

  @override
  void dispose() {
    widget.remaining.removeListener(_onTick);
    super.dispose();
  }

  void _onTick() {
    if (!_hidden) return;
    final r = widget.remaining.value;
    if (r != null && r <= widget.returnAtSeconds) {
      unawaited(HapticFeedback.lightImpact());
      setState(() => _hidden = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int?>(
      valueListenable: widget.remaining,
      builder: (context, r, _) {
        if (r == null) return const SizedBox.shrink();
        final canHide = r > widget.returnAtSeconds;
        if (_hidden && canHide) return _HiddenTimer(onShow: () => setState(() => _hidden = false));
        return _TimerBox(seconds: r, onHide: canHide ? () => setState(() => _hidden = true) : null);
      },
    );
  }
}

class _HiddenTimer extends StatelessWidget {
  const _HiddenTimer({required this.onShow});

  final VoidCallback onShow;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Хугацааг харуулах',
      icon: Icon(AppIcons.show, size: 20, color: context.colors.inkDim),
      onPressed: onShow,
    );
  }
}

class _TimerBox extends StatelessWidget {
  const _TimerBox({required this.seconds, required this.onHide});

  final int seconds;

  /// null бол нууж болохгүй (5 минутаас дотор).
  final VoidCallback? onHide;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    // Улаан, анивчилт ХОРИОТОЙ — сүүлийн минутад зөвхөн хүрээ, үсэг тодорно.
    final urgent = seconds <= 60;
    final box = Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: AppSpace.xs),
      constraints: const BoxConstraints(minHeight: AppSizes.minTap),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: urgent ? c.ink : c.line, width: urgent ? 2 : 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(ExamIcons.timer, size: 16, color: urgent ? c.ink : c.inkDim),
          const SizedBox(width: AppSpace.xs),
          Text(
            formatRemaining(seconds),
            style: context.text.titleMedium?.copyWith(
              color: c.ink,
              fontWeight: urgent ? FontWeight.w700 : null,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
    return Semantics(
      liveRegion: urgent,
      button: onHide != null,
      label: 'Үлдсэн хугацаа ${spokenRemaining(seconds)}',
      hint: onHide == null ? null : 'Нуух бол давхар товшино уу',
      onTap: onHide,
      excludeSemantics: true,
      child: onHide == null
          ? box
          : InkWell(onTap: onHide, borderRadius: BorderRadius.circular(AppRadius.sm), child: box),
    );
  }
}
