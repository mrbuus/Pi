import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/time/date_mn.dart';
import '../../core/time/ub_time.dart';
import '../../core/ui/ui.dart';

/// Өдрийн хуваарийн нэг үйл явдал (хичээл, уулзалт). Цаг нь Улаанбаатарын.
@immutable
class AgendaEvent {
  const AgendaEvent({
    required this.id,
    required this.start,
    required this.end,
    required this.title,
    this.subtitle,
    this.color,
    this.data,
  });

  final Object id;
  final UbDateTime start;
  final UbDateTime end;
  final String title;

  /// Танхим, багш гэх мэт (цагийн доор).
  final String? subtitle;

  /// Зүүн талын зурвасын өнгө (анги, багшийн өнгө). Өгөөгүй бол брэндийн хөх.
  final Color? color;

  /// Дуудагчийн өөрийн өгөгдөл (дарахад буцааж авах).
  final Object? data;
}

/// Давхцсан үйл явдлын байрлал: [columns] багананаас [column]-д.
@immutable
class AgendaPlacement {
  const AgendaPlacement(this.event, this.column, this.columns);

  final AgendaEvent event;
  final int column;
  final int columns;
}

/// Давхцалыг тооцох цэвэр функц (Google Calendar маяг): цаг нь огтлолцох бүлэг бүрт багана хуваарилна,
/// бүлгийн бүх үйл явдал ижил өргөнтэй ([AgendaPlacement.columns]).
List<AgendaPlacement> layoutAgenda(List<AgendaEvent> events) {
  final sorted = [...events]
    ..sort((a, b) {
      final s = a.start.compareTo(b.start);
      return s != 0 ? s : b.end.compareTo(a.end);
    });
  final out = <AgendaPlacement>[];
  var cluster = <(AgendaEvent, int)>[];
  var columnEnds = <UbDateTime>[];
  UbDateTime? clusterEnd;

  void flush() {
    final n = columnEnds.length;
    for (final (e, col) in cluster) {
      out.add(AgendaPlacement(e, col, n));
    }
    cluster = [];
    columnEnds = [];
    clusterEnd = null;
  }

  for (final e in sorted) {
    if (clusterEnd != null && e.start.compareTo(clusterEnd!) >= 0) flush();
    var col = columnEnds.indexWhere((end) => end.compareTo(e.start) <= 0);
    if (col < 0) {
      col = columnEnds.length;
      columnEnds.add(e.end);
    } else {
      columnEnds[col] = e.end;
    }
    cluster.add((e, col));
    if (clusterEnd == null || e.end.compareTo(clusterEnd!) > 0) clusterEnd = e.end;
  }
  flush();
  return out;
}

/// Өдрийн хуваарь: цагийн мөрүүд, өнгөт зурвастай үйл явдлууд (давхцвал зэрэгцээ), «одоо» шугам.
/// Багш+ хоосон цаг дээр дарж нэмнэ ([onSlotTap]); Багш зөвхөн харна (`onSlotTap: null`).
class DayAgenda extends StatefulWidget {
  const DayAgenda({
    super.key,
    required this.day,
    required this.events,
    this.startHour = 8,
    this.endHour = 21,
    this.hourHeight = 72,
    this.onEventTap,
    this.onSlotTap,
    this.now,
    this.controller,
    this.emptyText,
    this.eventBuilder,
    this.padding = const EdgeInsets.fromLTRB(0, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
  });

  /// Харуулах өдөр.
  final UbDateTime day;
  final List<AgendaEvent> events;

  /// Харагдах цагийн хүрээ. Хүрээнээс гадуурх үйл явдал байвал автоматаар тэлнэ.
  final int startHour;
  final int endHour;

  /// 1 цагийн өндөр (72 = 40 минутын хичээл 48dp-ээс багагүй).
  final double hourHeight;
  final ValueChanged<AgendaEvent>? onEventTap;

  /// Хоосон цаг дарах — тухайн 30 минутын эхлэл.
  final ValueChanged<UbDateTime>? onSlotTap;

  /// Одоогийн цаг (тест). Өгөөгүй бол [UbDateTime.now], минут тутам шинэчлэгдэнэ.
  final UbDateTime? now;
  final ScrollController? controller;

  /// Үйл явдалгүй өдөр торны дээр харуулах бичвэр.
  final String? emptyText;

  /// Үйл явдлын картыг өөрөөр зурах.
  final Widget Function(BuildContext context, AgendaEvent event)? eventBuilder;
  final EdgeInsets padding;

  static const gutterWidth = 52.0;

  @override
  State<DayAgenda> createState() => _DayAgendaState();
}

class _DayAgendaState extends State<DayAgenda> {
  ScrollController? _own;
  Timer? _tick;

  ScrollController get _scroll =>
      widget.controller ?? (_own ??= ScrollController(initialScrollOffset: _initialOffset()));

  UbDateTime get _now => widget.now ?? UbDateTime.now();

  bool get _isToday => widget.day.isSameDay(_now);

  @override
  void initState() {
    super.initState();
    _syncTimer();
  }

  @override
  void didUpdateWidget(DayAgenda old) {
    super.didUpdateWidget(old);
    _syncTimer();
    if (!old.day.isSameDay(widget.day) && widget.controller == null && _own != null && _own!.hasClients) {
      _own!.jumpTo(_initialOffset().clamp(0, _own!.position.maxScrollExtent));
    }
  }

  void _syncTimer() {
    final want = widget.now == null && _isToday;
    if (want && _tick == null) {
      _tick = Timer.periodic(const Duration(minutes: 1), (_) {
        if (mounted) setState(() {});
      });
    } else if (!want) {
      _tick?.cancel();
      _tick = null;
    }
  }

  @override
  void dispose() {
    _tick?.cancel();
    _own?.dispose();
    super.dispose();
  }

  /// Өдрийн эхлэлээс хэдэн минут (өөр өдрийнх бол 0 эсвэл 1440 рүү хавчина).
  int _minuteOf(UbDateTime t) {
    final d = t.dayIndex - widget.day.dayIndex;
    if (d < 0) return 0;
    if (d > 0) return 24 * 60;
    return t.hour * 60 + t.minute;
  }

  (int, int) _range() {
    var lo = widget.startHour;
    var hi = widget.endHour;
    for (final e in widget.events) {
      lo = math.min(lo, _minuteOf(e.start) ~/ 60);
      hi = math.max(hi, (_minuteOf(e.end) + 59) ~/ 60);
    }
    return (lo.clamp(0, 23), hi.clamp(lo + 1, 24));
  }

  double _y(int minute, int startHour) => (minute - startHour * 60) * widget.hourHeight / 60;

  double _initialOffset() {
    final (lo, _) = _range();
    int target;
    if (_isToday) {
      target = _minuteOf(_now) - 60;
    } else if (widget.events.isNotEmpty) {
      target = widget.events.map((e) => _minuteOf(e.start)).reduce(math.min) - 30;
    } else {
      target = lo * 60;
    }
    return math.max(0, _y(target, lo));
  }

  @override
  Widget build(BuildContext context) {
    final (lo, hi) = _range();
    final height = (hi - lo) * widget.hourHeight;
    return SingleChildScrollView(
      controller: _scroll,
      padding: widget.padding,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          return SizedBox(
            height: height + AppSpace.md,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned.fill(child: _grid(context, lo, hi)),
                if (widget.onSlotTap != null) Positioned.fill(child: _slotLayer(lo, height)),
                ..._eventWidgets(context, lo, width),
                if (widget.events.isEmpty && widget.emptyText != null)
                  Positioned(
                    top: AppSpace.lg,
                    left: DayAgenda.gutterWidth,
                    right: 0,
                    child: IgnorePointer(
                      child: Text(
                        widget.emptyText!,
                        textAlign: TextAlign.center,
                        style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                      ),
                    ),
                  ),
                if (_isToday) ?_nowLine(context, lo, hi),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _grid(BuildContext context, int lo, int hi) {
    final c = context.colors;
    return ExcludeSemantics(
      child: Stack(
        children: [
          for (var h = lo; h <= hi; h++) ...[
            Positioned(
              top: _y(h * 60, lo),
              left: DayAgenda.gutterWidth,
              right: 0,
              child: Container(height: 1, color: c.line),
            ),
            if (h < hi)
              Positioned(
                top: _y(h * 60, lo) - 8,
                left: 0,
                width: DayAgenda.gutterWidth - AppSpace.sm,
                child: Text(
                  '${h.toString().padLeft(2, '0')}:00',
                  textAlign: TextAlign.right,
                  style: context.text.labelSmall?.copyWith(color: c.inkDim),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _slotLayer(int lo, double height) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTapUp: (d) {
        if (d.localPosition.dx < DayAgenda.gutterWidth) return;
        final minute = (lo * 60 + d.localPosition.dy * 60 / widget.hourHeight).floor();
        final slot = (minute ~/ 30) * 30;
        if (slot < 0 || slot >= 24 * 60) return;
        widget.onSlotTap!(UbDateTime(widget.day.year, widget.day.month, widget.day.day, slot ~/ 60, slot % 60));
      },
    );
  }

  List<Widget> _eventWidgets(BuildContext context, int lo, double width) {
    final area = width - DayAgenda.gutterWidth;
    return [
      for (final p in layoutAgenda(widget.events))
        () {
          final top = _y(_minuteOf(p.event.start), lo);
          final bottom = _y(_minuteOf(p.event.end), lo);
          final colWidth = area / p.columns;
          return Positioned(
            key: ValueKey('agenda:${p.event.id}'),
            top: top + 1,
            height: math.max(22, bottom - top - 2),
            left: DayAgenda.gutterWidth + p.column * colWidth + 2,
            width: colWidth - 4,
            child:
                widget.eventBuilder?.call(context, p.event) ??
                _AgendaTile(
                  event: p.event,
                  onTap: widget.onEventTap == null ? null : () => widget.onEventTap!(p.event),
                ),
          );
        }(),
    ];
  }

  Widget? _nowLine(BuildContext context, int lo, int hi) {
    final m = _minuteOf(_now);
    if (m < lo * 60 || m > hi * 60) return null;
    final c = context.colors;
    return Positioned(
      key: const ValueKey('agenda:now'),
      top: _y(m, lo) - 4,
      left: DayAgenda.gutterWidth - 4,
      right: 0,
      child: IgnorePointer(
        child: Semantics(
          label: 'Одоо ${DateMn.time(_now)}',
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(color: c.brandBright, shape: BoxShape.circle),
              ),
              Expanded(child: Container(height: 2, color: c.brandBright)),
            ],
          ),
        ),
      ),
    );
  }
}

class _AgendaTile extends StatelessWidget {
  const _AgendaTile({required this.event, this.onTap});

  final AgendaEvent event;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final time = '${DateMn.time(event.start)}–${DateMn.time(event.end)}';
    return Semantics(
      button: onTap != null,
      label: [event.title, time, ?event.subtitle].join(', '),
      excludeSemantics: true,
      child: Material(
        color: c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          side: BorderSide(color: c.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(left: BorderSide(color: event.color ?? c.brand, width: 3)),
            ),
            child: LayoutBuilder(
              builder: (context, box) {
                final roomy = box.maxHeight >= 44;
                return Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: roomy ? 4 : 1),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Flexible: том фонтын тохиргоотой ч хайрцгаас халихгүй (бичвэр тайрагдана).
                      Flexible(
                        child: Text(
                          event.title,
                          maxLines: box.maxHeight >= 60 ? 2 : 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.labelMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                      if (roomy)
                        Text(
                          [time, ?event.subtitle].join('  '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.labelSmall?.copyWith(color: c.inkDim),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
