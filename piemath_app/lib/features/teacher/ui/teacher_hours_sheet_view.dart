import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../data/teacher_hours_sheet.dart';
import '../domain/teacher_hours_logic.dart';
import 'teacher_hours_account.dart';

/// «Ажилласан цаг» — эзний Excel «Цаг»-ийн апп хувилбар (вэбийн `teacher-hours/WorkSheet.tsx`, эзэн 2026-11-08).
///
/// Вэбийн 15 баганатай хүснэгт утсанд багтахгүй тул натив хэлбэр: дээр хагас сарын өдрийн мөр (+ «Нийт»),
/// доор тэр өдрийн багш бүрийн цаг. Эзэн өдөр бүрийн оройд тухайн өдрийн баганыг дээрээс доош бөглөдөг —
/// гарын «Дараах» доорх багш руу, жагсаалт дуусахад дараагийн өдрийн эхний багш руу шилжинэ (вэбийн Enter).
/// Утга 1 секундын дараа эсвэл нүднээс гарахад автоматаар хадгалагдана; хадгалагдаагүй нүд улаанаар үлдэнэ.
/// «Нийт»-д багш бүрийн хагас сарын нийт цаг; хөлс, цалинг зөвхөн сервер зөвшөөрсөн нэг хүн (`seesPay`) харна.
class TeacherHoursSheetView extends ConsumerStatefulWidget {
  const TeacherHoursSheetView({super.key});

  @override
  ConsumerState<TeacherHoursSheetView> createState() => _TeacherHoursSheetViewState();
}

sealed class _CellState {
  const _CellState();
}

class _Saving extends _CellState {
  const _Saving();
}

class _Failed extends _CellState {
  const _Failed(this.message);

  final String message;
}

class _TeacherHoursSheetViewState extends ConsumerState<TeacherHoursSheetView> {
  /// null = одоогийн үе.
  String? _period;

  /// Сонгосон өдөр; null бол «Нийт».
  String? _day;
  String? _dayPeriod;

  /// Хадгалагдсан (серверийн) утга, бичиж буй ноорог, нүдний төлөв — `teacherId|огноо` түлхүүрээр.
  final _values = <String, int>{};
  final _drafts = <String, String>{};
  final _cell = <String, _CellState>{};
  final _timers = <String, Timer>{};
  final _inflight = <String>{};
  final _again = <String>{};
  bool _saved = false;

  /// Сүүлд нэгтгэсэн хариу (давхар нэгтгэхгүй).
  HoursSheet? _merged;

  /// Хөлсний ноорог ба хадгалж буй мөр.
  final _rateDrafts = <String, String>{};
  final _rateSaving = <String>{};

  /// Дансаа оруулсан гэж шинэчилсэн мөр.
  final _accountSaved = <String>{};

  final _nodes = <FocusNode>[];
  int? _focusAfterBuild;

  /// Build-д шинэчилнэ — `dispose`-ийн дараа ч (ноорог илгээхэд) `ref`-гүйгээр ашиглана.
  late TeacherHoursSheetRepository _repo;

  @override
  void dispose() {
    // Хадгалаагүй ноорог алдагдахгүй — хүлээлгүй шууд илгээнэ (хариуг widget хүлээхгүй).
    for (final t in _timers.values) {
      t.cancel();
    }
    _timers.clear();
    for (final key in [..._drafts.keys]) {
      unawaited(_saveKey(key));
    }
    for (final n in _nodes) {
      n.dispose();
    }
    super.dispose();
  }

  void _set(VoidCallback fn) {
    if (mounted) {
      setState(fn);
    } else {
      fn();
    }
  }

  /// Серверийн хариуг нэгтгэнэ: энэ үеийн өдрүүдийг серверийнхээр (ноорогтойг хэвээр), бусад үе хэвээр.
  void _merge(HoursSheet s) {
    if (identical(_merged, s)) return;
    _merged = s;
    final days = s.period.days.toSet();
    _values.removeWhere((k, _) => days.contains(k.substring(k.indexOf('|') + 1)));
    for (final r in s.rows) {
      for (final MapEntry(:key, :value) in r.cells.entries) {
        _values[hoursKey(r.teacherId, key)] = value;
      }
    }
    if (_dayPeriod != s.period.id) {
      _dayPeriod = s.period.id;
      _day = s.period.days.contains(s.today) ? s.today : s.period.days.first;
    }
  }

  int? _effective(String key) {
    final d = _drafts[key];
    if (d != null) {
      final p = parseHoursInput(d);
      if (p.ok) return p.hundredths;
    }
    return _values[key];
  }

  // ------------------------------------------------------------------ Хадгалах

  void _onType(String key, String text) {
    _set(() {
      _drafts[key] = text;
      if (_cell[key] is _Failed) _cell.remove(key);
    });
    _timers.remove(key)?.cancel();
    _timers[key] = Timer(hoursSaveDelay, () => unawaited(_saveKey(key)));
  }

  Future<void> _saveKey(String key) async {
    _timers.remove(key)?.cancel();
    final text = _drafts[key];
    if (text == null) return;
    final parsed = parseHoursInput(text);
    if (!parsed.ok) {
      _set(() => _cell[key] = _Failed(parsed.error!));
      return;
    }
    void clearDraft() {
      if (_drafts[key] == text) _drafts.remove(key);
    }

    if (parsed.hundredths == _values[key]) {
      _set(() {
        clearDraft();
        _cell.remove(key);
      });
      return;
    }
    if (_inflight.contains(key)) {
      _again.add(key);
      return;
    }
    _inflight.add(key);
    _set(() => _cell[key] = const _Saving());
    final sep = key.indexOf('|');
    try {
      final saved = await _repo.setCell(teacherId: key.substring(0, sep), date: key.substring(sep + 1), value: text);
      _set(() {
        if (saved == null) {
          _values.remove(key);
        } else {
          _values[key] = saved;
        }
        clearDraft();
        _cell.remove(key);
        _saved = true;
      });
    } catch (e) {
      _set(() => _cell[key] = _Failed(e is ApiError ? e.message : 'Хадгалж чадсангүй'));
    } finally {
      _inflight.remove(key);
      if (_again.remove(key)) unawaited(_saveKey(key));
    }
  }

  void _revert(String key) {
    _timers.remove(key)?.cancel();
    _set(() {
      _drafts.remove(key);
      _cell.remove(key);
    });
  }

  void _retryAll() {
    for (final key in [..._drafts.keys]) {
      unawaited(_saveKey(key));
    }
  }

  void _flushAll() {
    for (final key in [..._timers.keys]) {
      unawaited(_saveKey(key));
    }
  }

  // ------------------------------------------------------------------ Шилжих

  void _goPeriod(String? id) {
    _flushAll();
    setState(() => _period = id);
  }

  void _selectDay(String? day) {
    if (day == _day) return;
    _flushAll();
    FocusScope.of(context).unfocus();
    setState(() => _day = day);
  }

  FocusNode _node(int i) {
    while (_nodes.length <= i) {
      _nodes.add(FocusNode());
    }
    return _nodes[i];
  }

  /// «Дараах»: хадгалаад доорх багш; жагсаалт дуусвал дараагийн өдрийн эхний багш.
  void _next(HoursSheet s, int row, String key) {
    unawaited(_saveKey(key));
    final days = s.period.days;
    final col = days.indexOf(_day ?? '');
    final next = nextHoursCell(row, col, rows: s.rows.length, cols: days.length);
    if (next == null) {
      FocusScope.of(context).unfocus();
      return;
    }
    if (next.col == col) {
      _node(next.row).requestFocus();
    } else {
      setState(() {
        _day = days[next.col];
        _focusAfterBuild = next.row;
      });
    }
  }

  // ------------------------------------------------------------------ Хөлс

  Future<void> _saveRate(HoursSheet s, HoursPay? pay, String teacherId) async {
    final text = _rateDrafts[teacherId];
    if (text == null) return;
    final digits = text.replaceAll(RegExp(r'\D'), '');
    final current = pay?.of(teacherId)?.ratePerHour;
    final next = digits.isEmpty ? null : int.parse(digits);
    if (next == current) {
      setState(() => _rateDrafts.remove(teacherId));
      return;
    }
    final messenger = ScaffoldMessenger.maybeOf(context);
    setState(() => _rateSaving.add(teacherId));
    try {
      await _repo.setRate(teacherId: teacherId, period: s.period.id, ratePerHour: next);
      ref.invalidate(teacherHoursPayProvider(s.period.id));
      await ref.read(teacherHoursPayProvider(s.period.id).future);
      if (mounted) setState(() => _rateDrafts.remove(teacherId));
    } catch (e) {
      messenger?.showSnackBar(SnackBar(content: Text(e is ApiError ? e.message : 'Хадгалж чадсангүй')));
    } finally {
      if (mounted) setState(() => _rateSaving.remove(teacherId));
    }
  }

  // ------------------------------------------------------------------ CSV

  Future<void> _shareCsv(HoursSheet s, BuildContext buttonContext) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    final launcher = ref.read(shareLauncherProvider);
    final rb = buttonContext.findRenderObject() as RenderBox?;
    final origin = rb == null ? null : rb.localToGlobal(Offset.zero) & rb.size;
    final csv = hoursCsv(
      rows: [for (final r in s.rows) (teacherId: r.teacherId, name: r.name)],
      days: s.period.days,
      valueOf: _effective,
    );
    try {
      final base = await ref.read(teacherHoursTempDirProvider)();
      final dir = Directory('${base.path}/piemath_share');
      if (!dir.existsSync()) dir.createSync(recursive: true);
      final file = File('${dir.path}/ajillasan-tsag-${s.period.id}.csv');
      await file.writeAsString(csv, flush: true);
      final ok = await launcher.shareFile(file, mimeType: 'text/csv', subject: 'Ажилласан цаг', origin: origin);
      if (!ok) messenger?.showSnackBar(const SnackBar(content: Text('Энэ утсанд хуваалцах боломжгүй байна')));
    } catch (_) {
      messenger?.showSnackBar(const SnackBar(content: Text('Файл үүсгэж чадсангүй')));
    }
  }

  Future<void> _openAccount(String teacherId, String name) async {
    final saved = await showTeacherAccountSheet(context, teacherId: teacherId, name: name);
    if (saved && mounted) setState(() => _accountSaved.add(teacherId));
  }

  // ------------------------------------------------------------------ Дүрслэл

  @override
  Widget build(BuildContext context) {
    _repo = ref.watch(teacherHoursSheetRepositoryProvider);
    final async = ref.watch(teacherHoursSheetProvider(_period));
    final s = async.value;
    if (s == null) {
      if (async.hasError) {
        final e = async.error;
        return ErrorState(
          message: e is ApiError ? e.message : AppStrings.genericError,
          onRetry: () => ref.invalidate(teacherHoursSheetProvider(_period)),
        );
      }
      return const LoadingState(key: ValueKey('hours-skeleton'), cards: 5);
    }
    _merge(s);
    final pay = s.seesPay ? ref.watch(teacherHoursPayProvider(s.period.id)).value : null;
    final seesPay = s.seesPay && pay != null;

    if (_focusAfterBuild case final row?) {
      _focusAfterBuild = null;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _node(row).requestFocus();
      });
    }

    final errors = _drafts.keys.where((k) => _cell[k] is _Failed || !parseHoursInput(_drafts[k]).ok).length;
    final saving = _cell.values.whereType<_Saving>().isNotEmpty || (_drafts.isNotEmpty && errors == 0);
    final loading = async.isLoading;

    return RefreshIndicator(
      onRefresh: () => ref.refresh(teacherHoursSheetProvider(_period).future),
      child: ListView(
        key: const ValueKey('hours-list'),
        padding: const EdgeInsets.only(bottom: AppSpace.xxl),
        children: [
          _PeriodBar(
            sheet: s,
            loading: loading,
            onPeriod: _goPeriod,
            status: _SaveStatus(saving: saving, errors: errors, saved: _saved, onRetry: _retryAll),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            child: Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.xs,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                OutlinedButton.icon(
                  key: const ValueKey('hours:my-account'),
                  onPressed: () => unawaited(_openAccount(s.viewerId, 'Миний данс')),
                  icon: const Icon(AppIcons.bank, size: 18),
                  label: const Text('Миний данс'),
                ),
                if (s.rows.isNotEmpty)
                  Builder(
                    builder: (b) => OutlinedButton.icon(
                      key: const ValueKey('hours:csv'),
                      onPressed: () => unawaited(_shareCsv(s, b)),
                      icon: const Icon(AppIcons.share, size: 18),
                      label: const Text('CSV хуваалцах'),
                    ),
                  ),
                InfoHint(
                  title: 'Хүснэгтийн тайлбар',
                  message: s.canEdit
                      ? 'Өдрөө сонгоод нүдэнд цагаа бичнэ: 7, 7,5 эсвэл 7.5. Гарын «Дараах» доорх багш руу, жагсаалт '
                            'дуусахад дараагийн өдөр рүү шилжинэ. Бичсэн утга автоматаар хадгалагдана. Нэр дээр дарж '
                            'дансыг харна'
                      : 'Цагийг эрхтэй ажилтан бөглөнө. Нэр дээр дарж дансыг харна, өөрийнхөө дансыг «Миний данс»-аас '
                            'засна',
                ),
              ],
            ),
          ),
          if (s.rows.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: AppSpace.xl),
              child: EmptyState(
                icon: AppIcons.students,
                title: 'Ажлын өдрийн хүснэгтэд багш бүртгэгдээгүй байна',
                message: 'Хуваарийн «Багшийн ажлын өдөр» хэсэгт нэмбэл энд гарна',
              ),
            )
          else ...[
            _DayStrip(
              days: s.period.days,
              today: s.today,
              selected: _day,
              totalOf: (d) => s.rows.fold(0, (sum, r) => sum + (_effective(hoursKey(r.teacherId, d)) ?? 0)),
              onSelected: _selectDay,
            ),
            if (_day == null) ..._totals(context, s, pay, seesPay) else ..._dayRows(context, s, _day!),
            _Legend(today: dayNumberOf(s.today), seesPay: seesPay),
          ],
        ],
      ),
    );
  }

  List<Widget> _dayRows(BuildContext context, HoursSheet s, String day) {
    final c = context.colors;
    final total = s.rows.fold(0, (sum, r) => sum + (_effective(hoursKey(r.teacherId, day)) ?? 0));
    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.sm),
        child: Row(
          children: [
            Expanded(
              child: Semantics(header: true, child: Text(hoursDateLabel(day), style: context.text.titleSmall)),
            ),
            Text(
              'Нийт ${formatHundredths(total)} цаг',
              key: const ValueKey('hours:day-total'),
              style: context.text.bodyMedium?.copyWith(color: c.inkDim),
            ),
          ],
        ),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
        child: AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (final (i, r) in s.rows.indexed) ...[
                if (i > 0) Divider(height: 1, color: c.line),
                _TeacherDayRow(
                  key: ValueKey('hours-row:${r.teacherId}|$day'),
                  row: r,
                  day: day,
                  hasAccount: r.hasAccount || _accountSaved.contains(r.teacherId),
                  periodTotal: s.period.days.fold(0, (sum, d) => sum + (_effective(hoursKey(r.teacherId, d)) ?? 0)),
                  text: _drafts[hoursKey(r.teacherId, day)] ?? formatHundredths(_values[hoursKey(r.teacherId, day)]),
                  state: _cell[hoursKey(r.teacherId, day)],
                  draftError: switch (_drafts[hoursKey(r.teacherId, day)]) {
                    final d? => parseHoursInput(d).error,
                    null => null,
                  },
                  canEdit: s.canEdit,
                  last: i == s.rows.length - 1 && day == s.period.days.last,
                  focusNode: s.canEdit ? _node(i) : null,
                  onChanged: (t) => _onType(hoursKey(r.teacherId, day), t),
                  onSubmitted: () => _next(s, i, hoursKey(r.teacherId, day)),
                  onBlur: () => unawaited(_saveKey(hoursKey(r.teacherId, day))),
                  onRevert: () => _revert(hoursKey(r.teacherId, day)),
                  onName: () => unawaited(_openAccount(r.teacherId, r.name)),
                ),
              ],
            ],
          ),
        ),
      ),
    ];
  }

  List<Widget> _totals(BuildContext context, HoursSheet s, HoursPay? pay, bool seesPay) {
    final c = context.colors;
    int rowTotal(HoursSheetRow r) =>
        s.period.days.fold(0, (sum, d) => sum + (_effective(hoursKey(r.teacherId, d)) ?? 0));
    int? payOf(HoursSheetRow r) {
      final rate = pay?.of(r.teacherId)?.ratePerHour;
      return rate == null ? null : payAmount(rowTotal(r), rate);
    }

    final grand = s.rows.fold(0, (sum, r) => sum + rowTotal(r));
    final payTotal = seesPay ? s.rows.fold(0, (sum, r) => sum + (payOf(r) ?? 0)) : 0;
    return [
      Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.sm),
        child: Semantics(
          header: true,
          child: Text(periodLabel(s.period.start, s.period.end), style: context.text.titleSmall),
        ),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
        child: AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (final (i, r) in s.rows.indexed) ...[
                if (i > 0) Divider(height: 1, color: c.line),
                _TotalRow(
                  key: ValueKey('hours-total:${r.teacherId}'),
                  teacherId: r.teacherId,
                  name: r.name,
                  hasAccount: r.hasAccount || _accountSaved.contains(r.teacherId),
                  total: rowTotal(r),
                  onName: () => unawaited(_openAccount(r.teacherId, r.name)),
                  rate: seesPay ? pay?.of(r.teacherId) : null,
                  seesPay: seesPay,
                  rateDraft: _rateDrafts[r.teacherId],
                  rateSaving: _rateSaving.contains(r.teacherId),
                  pay: seesPay ? payOf(r) : null,
                  onRateChanged: (t) => setState(() => _rateDrafts[r.teacherId] = t.replaceAll(RegExp(r'\D'), '')),
                  onRateDone: () => unawaited(_saveRate(s, pay, r.teacherId)),
                ),
              ],
              Divider(height: 1, color: c.line),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
                child: Row(
                  children: [
                    Expanded(child: Text('Нийт', style: context.text.titleSmall)),
                    Text(
                      '${formatHundredths(grand)} цаг',
                      key: const ValueKey('hours:grand-total'),
                      style: context.text.titleSmall,
                    ),
                    if (seesPay) ...[
                      const SizedBox(width: AppSpace.md),
                      Text(formatMnt(payTotal), key: const ValueKey('hours:pay-total'), style: context.text.titleSmall),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ];
  }
}

/// Үе сонгох: ‹ «2026 оны 11-р сар, 1–15» › + «Одоогийн үе» + хадгалалтын төлөв.
class _PeriodBar extends StatelessWidget {
  const _PeriodBar({required this.sheet, required this.loading, required this.onPeriod, required this.status});

  final HoursSheet sheet;
  final bool loading;
  final ValueChanged<String?> onPeriod;
  final Widget status;

  @override
  Widget build(BuildContext context) {
    final p = sheet.period;
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.xs, AppSpace.sm, AppSpace.xs, AppSpace.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              IconButton(
                tooltip: 'Өмнөх хагас сар',
                icon: const Icon(AppIcons.back),
                onPressed: loading ? null : () => onPeriod(p.prev),
              ),
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    periodLabel(p.start, p.end),
                    key: const ValueKey('hours:period'),
                    textAlign: TextAlign.center,
                    style: context.text.titleSmall,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Дараагийн хагас сар',
                icon: const Icon(AppIcons.forward),
                onPressed: loading || p.next == null ? null : () => onPeriod(p.next),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
            child: Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: AppSpace.sm,
              children: [
                if (p.id != p.current)
                  TextButton(onPressed: () => onPeriod(p.current), child: const Text('Одоогийн үе')),
                status,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SaveStatus extends StatelessWidget {
  const _SaveStatus({required this.saving, required this.errors, required this.saved, required this.onRetry});

  final bool saving;
  final int errors;
  final bool saved;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget line(IconData icon, String text, Color color) => Semantics(
      liveRegion: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: AppSpace.xs),
          Text(
            text,
            style: context.text.bodySmall?.copyWith(color: color, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
    if (errors > 0) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          line(AppIcons.error, '$errors нүд хадгалагдаагүй', c.error),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(AppIcons.retry, size: 16),
            label: const Text(AppStrings.retry),
          ),
        ],
      );
    }
    if (saving) return line(AppIcons.loaderCircle, 'Хадгалж байна', c.inkDim);
    if (saved) return line(AppIcons.success, 'Хадгалагдсан', c.success);
    return const SizedBox.shrink();
  }
}

/// Хагас сарын өдрийн мөр: өдөр, гараг, тэр өдрийн нийт цаг + төгсгөлд «Нийт».
class _DayStrip extends StatefulWidget {
  const _DayStrip({
    required this.days,
    required this.today,
    required this.selected,
    required this.totalOf,
    required this.onSelected,
  });

  final List<String> days;
  final String today;

  /// null = «Нийт».
  final String? selected;
  final int Function(String day) totalOf;
  final ValueChanged<String?> onSelected;

  static const cellWidth = 56.0;

  @override
  State<_DayStrip> createState() => _DayStripState();
}

class _DayStripState extends State<_DayStrip> {
  late final _scroll = ScrollController(initialScrollOffset: _offsetFor(widget.selected));

  double _offsetFor(String? day) {
    final i = day == null ? widget.days.length : widget.days.indexOf(day);
    return i <= 2 ? 0 : (i - 2) * (_DayStrip.cellWidth + AppSpace.xs);
  }

  @override
  void didUpdateWidget(_DayStrip old) {
    super.didUpdateWidget(old);
    if (old.selected != widget.selected || old.days.first != widget.days.first) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !_scroll.hasClients) return;
        final target = _offsetFor(widget.selected).clamp(0.0, _scroll.position.maxScrollExtent);
        unawaited(_scroll.animateTo(target, duration: AppMotion.enter, curve: AppEasing.decelerate));
      });
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 76,
      // 16 хүртэл зүйл — бүгдийг зурна (гүйлгэх байрлал тооцоход хялбар).
      child: SingleChildScrollView(
        key: const ValueKey('hours-days'),
        controller: _scroll,
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: AppSpace.xs),
        child: Row(
          children: [
            for (final d in widget.days)
              _DayChip(
                key: ValueKey('hours-day:$d'),
                top: '${dayNumberOf(d)}',
                bottom: weekdayShortMn(weekdayOfKey(d)),
                note: switch (widget.totalOf(d)) {
                  0 => null,
                  final t => formatHundredths(t),
                },
                label: '${hoursDateLabel(d)}${d == widget.today ? ', өнөөдөр' : ''}',
                selected: widget.selected == d,
                today: d == widget.today,
                onTap: () => widget.onSelected(d),
              ),
            _DayChip(
              key: const ValueKey('hours-day:total'),
              top: 'Нийт',
              bottom: 'цаг',
              label: 'Хагас сарын нийт',
              selected: widget.selected == null,
              today: false,
              wide: true,
              onTap: () => widget.onSelected(null),
            ),
          ],
        ),
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  const _DayChip({
    super.key,
    required this.top,
    required this.bottom,
    required this.label,
    required this.selected,
    required this.today,
    required this.onTap,
    this.note,
    this.wide = false,
  });

  final String top;
  final String bottom;
  final String? note;
  final String label;
  final bool selected;
  final bool today;
  final bool wide;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fg = selected ? c.onBrand : (today ? c.brand : c.ink);
    return Padding(
      padding: const EdgeInsets.only(right: AppSpace.xs),
      child: Semantics(
        button: true,
        selected: selected,
        label: label,
        excludeSemantics: true,
        child: Material(
          color: selected ? c.brand : Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            side: BorderSide(color: selected ? c.brand : (today ? c.brand : c.line), width: today ? 1.5 : 1),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(AppRadius.md),
            onTap: () {
              unawaited(HapticFeedback.selectionClick());
              onTap();
            },
            child: SizedBox(
              width: wide ? 64 : _DayStrip.cellWidth,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    top,
                    style: context.text.titleSmall?.copyWith(color: fg, fontWeight: FontWeight.w700),
                  ),
                  Text(bottom, style: context.text.labelSmall?.copyWith(color: selected ? c.onBrand : c.inkDim)),
                  Text(
                    note ?? '',
                    style: context.text.labelSmall?.copyWith(color: selected ? c.onBrand : c.brand, fontSize: 10),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Нэг багшийн тухайн өдрийн мөр: нэр (данс), хуваарьт орсон эсэх, хагас сарын нийт | цагийн нүд.
class _TeacherDayRow extends StatefulWidget {
  const _TeacherDayRow({
    super.key,
    required this.row,
    required this.day,
    required this.hasAccount,
    required this.periodTotal,
    required this.text,
    required this.state,
    required this.draftError,
    required this.canEdit,
    required this.last,
    required this.focusNode,
    required this.onChanged,
    required this.onSubmitted,
    required this.onBlur,
    required this.onRevert,
    required this.onName,
  });

  final HoursSheetRow row;
  final String day;
  final bool hasAccount;
  final int periodTotal;
  final String text;
  final _CellState? state;
  final String? draftError;
  final bool canEdit;
  final bool last;
  final FocusNode? focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onSubmitted;
  final VoidCallback onBlur;
  final VoidCallback onRevert;
  final VoidCallback onName;

  @override
  State<_TeacherDayRow> createState() => _TeacherDayRowState();
}

class _TeacherDayRowState extends State<_TeacherDayRow> {
  late final _controller = TextEditingController(text: widget.text);

  @override
  void initState() {
    super.initState();
    widget.focusNode?.addListener(_onFocus);
  }

  @override
  void didUpdateWidget(_TeacherDayRow old) {
    super.didUpdateWidget(old);
    if (old.focusNode != widget.focusNode) {
      old.focusNode?.removeListener(_onFocus);
      widget.focusNode?.addListener(_onFocus);
    }
    // Бичиж байх үед хэрэглэгчийн бичвэрийг дарахгүй; хадгалсны дараа серверийн хэлбэр («7.5»).
    final focused = widget.focusNode?.hasFocus ?? false;
    if (!focused && _controller.text != widget.text) _controller.text = widget.text;
  }

  @override
  void dispose() {
    widget.focusNode?.removeListener(_onFocus);
    _controller.dispose();
    super.dispose();
  }

  void _onFocus() {
    if (!mounted) return;
    final node = widget.focusNode!;
    if (node.hasFocus) {
      _controller.selection = TextSelection(baseOffset: 0, extentOffset: _controller.text.length);
    } else {
      widget.onBlur();
      if (_controller.text != widget.text) _controller.text = widget.text;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final r = widget.row;
    final staffed = r.staffed[widget.day];
    final failed = widget.state is _Failed ? (widget.state! as _Failed).message : null;
    final error = widget.draftError ?? failed;
    final saving = widget.state is _Saving;
    final label = '${r.name}, ${hoursDateLabel(widget.day)}${staffed != null ? ', хуваарьт орсон' : ''}';
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 64),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.xs, AppSpace.xs, AppSpace.md, AppSpace.xs),
        child: Row(
          children: [
            Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                onTap: widget.onName,
                child: Semantics(
                  button: true,
                  label: '${r.name}, данс харах',
                  excludeSemantics: true,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.xs),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                r.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: context.text.titleSmall,
                              ),
                            ),
                            if (widget.hasAccount) ...[
                              const SizedBox(width: AppSpace.xs),
                              Icon(AppIcons.bank, size: 14, color: c.inkDim),
                            ],
                          ],
                        ),
                        if (error != null)
                          Text(
                            error,
                            style: context.text.bodySmall?.copyWith(color: c.error, fontWeight: FontWeight.w600),
                          )
                        else ...[
                          if (staffed != null)
                            Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(color: c.brand, shape: BoxShape.circle),
                                ),
                                const SizedBox(width: AppSpace.xs),
                                Flexible(
                                  child: Text(
                                    'Хуваарьт ${staffed.lessons} хичээл (${minutesLabel(staffed.minutes)})',
                                    style: context.text.bodySmall?.copyWith(color: c.brand),
                                  ),
                                ),
                              ],
                            ),
                          Text(
                            'Нийт ${formatHundredths(widget.periodTotal)} цаг',
                            style: context.text.bodySmall?.copyWith(color: c.inkDim),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            if (widget.canEdit)
              SizedBox(
                width: 84,
                child: Semantics(
                  label: label,
                  child: TextField(
                    key: ValueKey('hours-cell:${r.teacherId}|${widget.day}'),
                    controller: _controller,
                    focusNode: widget.focusNode,
                    textAlign: TextAlign.center,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    textInputAction: widget.last ? TextInputAction.done : TextInputAction.next,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                      LengthLimitingTextInputFormatter(6),
                    ],
                    style: context.text.titleMedium?.copyWith(
                      color: saving ? c.inkDim : c.ink,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: '',
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      enabledBorder: error != null
                          ? OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                              borderSide: BorderSide(color: c.error, width: 2),
                            )
                          : null,
                      focusedBorder: error != null
                          ? OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                              borderSide: BorderSide(color: c.error, width: 2),
                            )
                          : null,
                      suffixIcon: error != null
                          ? IconButton(
                              tooltip: 'Буцаах',
                              icon: Icon(AppIcons.undo, size: 18, color: c.error),
                              onPressed: () {
                                widget.onRevert();
                                _controller.text = '';
                              },
                            )
                          : null,
                      suffixIconConstraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    ),
                    onChanged: widget.onChanged,
                    onSubmitted: (_) => widget.onSubmitted(),
                  ),
                ),
              )
            else
              SizedBox(
                width: 64,
                child: Semantics(
                  label: '$label, ${widget.text.isEmpty ? 'хоосон' : '${widget.text} цаг'}',
                  excludeSemantics: true,
                  child: Text(
                    widget.text,
                    textAlign: TextAlign.center,
                    style: context.text.titleMedium?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// «Нийт»: багшийн хагас сарын нийт цаг; seesPay бол хөлс (₮/цаг, засна) ба цалин.
class _TotalRow extends StatefulWidget {
  const _TotalRow({
    super.key,
    required this.teacherId,
    required this.name,
    required this.hasAccount,
    required this.total,
    required this.onName,
    required this.seesPay,
    required this.rate,
    required this.rateDraft,
    required this.rateSaving,
    required this.pay,
    required this.onRateChanged,
    required this.onRateDone,
  });

  final String teacherId;
  final String name;
  final bool hasAccount;
  final int total;
  final VoidCallback onName;
  final bool seesPay;
  final HoursPayRow? rate;
  final String? rateDraft;
  final bool rateSaving;
  final int? pay;
  final ValueChanged<String> onRateChanged;
  final VoidCallback onRateDone;

  @override
  State<_TotalRow> createState() => _TotalRowState();
}

class _TotalRowState extends State<_TotalRow> {
  late final _controller = TextEditingController(text: _shown);
  final _focus = FocusNode();

  String get _shown => widget.rateDraft ?? (widget.rate?.ratePerHour?.toString() ?? '');

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      if (!_focus.hasFocus) widget.onRateDone();
    });
  }

  @override
  void didUpdateWidget(_TotalRow old) {
    super.didUpdateWidget(old);
    if (!_focus.hasFocus && _controller.text != _shown) _controller.text = _shown;
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final rate = widget.rate;
    final inherited = rate?.ratePerHour != null && !rate!.setThisPeriod && widget.rateDraft == null;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 60),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.xs, AppSpace.xs, AppSpace.md, AppSpace.xs),
        child: Row(
          children: [
            Expanded(
              child: InkWell(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                onTap: widget.onName,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              widget.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: context.text.titleSmall,
                            ),
                          ),
                          if (widget.hasAccount) ...[
                            const SizedBox(width: AppSpace.xs),
                            Icon(AppIcons.bank, size: 14, color: c.inkDim),
                          ],
                        ],
                      ),
                      Text(
                        '${formatHundredths(widget.total)} цаг',
                        style: context.text.bodySmall?.copyWith(color: c.inkDim),
                      ),
                      if (widget.seesPay && widget.pay != null)
                        Text(
                          formatMnt(widget.pay!),
                          style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            if (widget.seesPay)
              SizedBox(
                width: 112,
                child: TextField(
                  key: ValueKey('hours-rate:${widget.teacherId}'),
                  controller: _controller,
                  focusNode: _focus,
                  enabled: !widget.rateSaving,
                  textAlign: TextAlign.end,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.done,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(7)],
                  style: context.text.titleSmall?.copyWith(color: inherited ? c.inkDim : c.ink),
                  decoration: InputDecoration(
                    isDense: true,
                    labelText: 'Хөлс ₮/цаг',
                    floatingLabelBehavior: FloatingLabelBehavior.always,
                    helperText: inherited && rate.rateFrom != null
                        ? '${rate.rateFrom!.substring(5).replaceAll('-', '.')}-аас'
                        : null,
                  ),
                  onChanged: widget.onRateChanged,
                  onSubmitted: (_) => _focus.unfocus(),
                ),
              )
            else
              Text('${formatHundredths(widget.total)} цаг', style: context.text.titleSmall),
          ],
        ),
      ),
    );
  }
}

/// Тайлбар — жагсаалтын доор.
class _Legend extends StatelessWidget {
  const _Legend({required this.today, required this.seesPay});

  final int today;
  final bool seesPay;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = context.text.bodySmall?.copyWith(color: c.inkDim);
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, 0),
      child: Wrap(
        spacing: AppSpace.lg,
        runSpacing: AppSpace.sm,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(color: c.brand, shape: BoxShape.circle),
              ),
              const SizedBox(width: AppSpace.sm),
              Text('Өдрийн хуваарьт орсон өдөр', style: style),
            ],
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  border: Border.all(color: c.brand, width: 1.5),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '$today',
                  style: style?.copyWith(color: c.brand, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Text('Өнөөдөр', style: style),
            ],
          ),
          if (seesPay) Text('Бүдэг хөлс — өмнөх үеэс өвлөгдсөн; шинээр бичвэл энэ үеэс эхлэн хэрэгжинэ', style: style),
        ],
      ),
    );
  }
}
