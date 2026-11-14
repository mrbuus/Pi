import 'dart:async';

import 'package:clock/clock.dart';
import 'package:flutter/widgets.dart';

import '../domain/photo_rules.dart';

/// Илгээснээс хойш 5 минутын цонх (вэбийн `PhotoSetSender.editableUntil`): [builder]-т засах боломжтой эсэхийг
/// өгнө; хугацаа дуусах агшинд өөрөө дахин зурна (товчнууд алга болно). Эцсийн шийдвэр серверт (403 мессеж).
class PhotoEditWindow extends StatefulWidget {
  const PhotoEditWindow({super.key, required this.sentAt, required this.builder});

  final DateTime? sentAt;
  final Widget Function(BuildContext context, bool inWindow) builder;

  @override
  State<PhotoEditWindow> createState() => _PhotoEditWindowState();
}

class _PhotoEditWindowState extends State<PhotoEditWindow> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _schedule();
  }

  @override
  void didUpdateWidget(PhotoEditWindow old) {
    super.didUpdateWidget(old);
    if (old.sentAt != widget.sentAt) _schedule();
  }

  void _schedule() {
    _timer?.cancel();
    _timer = null;
    final until = photoEditDeadline(widget.sentAt);
    if (until == null) return;
    final left = until.difference(clock.now());
    if (left <= Duration.zero) return;
    _timer = Timer(left + const Duration(milliseconds: 250), () {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.builder(context, photoEditable(widget.sentAt, clock.now()));
}
