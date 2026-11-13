import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/paper_exam_models.dart';
import '../data/paper_exams_repository.dart';
import '../domain/paper_exam_logic.dart';
import 'paper_ui.dart';

const _matchLabel = {'CODE': 'кодоор', 'LEGACY': 'хуучин кодоор', 'NAME': 'нэрээр'};

/// «Дүн оруулах» (Багш+, Админ; вэбийн `ImportPanel`): Excel (.xlsx) сонгох, урьдчилан харах (санд
/// бичихгүй), «Хадгалах». Холбогдоогүй хуудсыг сурагчтай холбох, оруулсан түүх, импорт буцаах
/// (зөөлөн: хуудас хүчингүй болж, орлосон хуучин нь сэргэнэ).
class ImportTab extends ConsumerStatefulWidget {
  const ImportTab({super.key, required this.examId, required this.board});

  final String examId;
  final PaperBoard board;

  @override
  ConsumerState<ImportTab> createState() => _ImportTabState();
}

class _ImportTabState extends ConsumerState<ImportTab> {
  PickedSheet? _file;
  ImportPreview? _preview;
  bool _replace = true;
  bool _showAll = false;
  bool _busy = false;
  String? _error;

  void _changed() {
    ref.invalidate(paperBoardProvider(widget.examId));
    ref.invalidate(paperImportsProvider(widget.examId));
    ref.invalidate(paperExamsProvider);
  }

  Future<void> _pick() async {
    final picker = ref.read(paperSheetPickerProvider);
    if (picker == null) return;
    final f = await picker.pick();
    if (f == null || !mounted) return;
    setState(() {
      _file = f;
      _preview = null;
      _showAll = false;
    });
    await _send(confirm: false);
  }

  Future<void> _send({required bool confirm}) async {
    final f = _file;
    if (f == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await ref
          .read(paperExamsRepositoryProvider)
          .importFile(widget.examId, fileName: f.name, bytes: f.bytes, confirm: confirm, replace: _replace);
      if (!mounted) return;
      if (confirm) {
        paperSnack(context, '${res.willWrite} сурагчийн дүн хадгаллаа');
        setState(() {
          _file = null;
          _preview = null;
        });
        _changed();
      } else {
        setState(() => _preview = res);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _preview = null;
          _error = paperError(e, 'Файлыг уншиж чадсангүй');
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _revert(ImportHistoryRow h) async {
    final ok = await confirmAction(
      context,
      title: 'Импортыг буцаах уу',
      message: '«${h.fileName}» файлаар орсон дүн хүчингүй болно',
      confirmLabel: 'Буцаах',
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(paperExamsRepositoryProvider).revertImport(h.id);
      if (mounted) paperSnack(context, 'Буцаалаа');
      _changed();
    } catch (e) {
      if (mounted) paperSnack(context, paperError(e, 'Буцааж чадсангүй'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _link(BoardRow row) async {
    final linked = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _LinkSheet(row: row),
    );
    if (linked == true) {
      if (mounted) paperSnack(context, 'Холболоо');
      _changed();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final picker = ref.watch(paperSheetPickerProvider);
    final history = ref.watch(paperImportsProvider(widget.examId));
    final p = _preview;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        TitledCard(
          title: 'Файл оруулах',
          icon: AppIcons.cloudUpload,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Шийт бүр нэг баг. Шифр, Овог, Нэр баганууд ба 1-ээс ${widget.board.itemCount} хүртэл дугаартай '
                'бодлогын баганууд. Нүдэнд 1 (зөв), хоосон (буруу), эсвэл уншигчийн гаргасан үсэг (A-E)',
                style: dim,
              ),
              const SizedBox(height: AppSpace.md),
              if (picker == null)
                Text('Энэ төхөөрөмжөөс файл сонгох боломжгүй', style: context.text.bodyMedium)
              else
                OutlinedButton.icon(
                  key: const Key('paper-pick'),
                  onPressed: _busy ? null : _pick,
                  icon: const Icon(AppIcons.document),
                  label: const Text('Excel файл (.xlsx) сонгох'),
                ),
              if (_busy && p == null && _file != null) ...[
                const SizedBox(height: AppSpace.md),
                Text('Уншиж байна', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
              ],
              if (_error != null) ...[
                const SizedBox(height: AppSpace.md),
                Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
              ],
            ],
          ),
        ),
        if (p != null && _file != null) ...[const SizedBox(height: AppSpace.lg), _previewCard(context, p)],
        if (widget.board.unmatched.isNotEmpty) ...[
          const SizedBox(height: AppSpace.lg),
          TitledCard(
            title: 'Сурагчтай холбогдоогүй хуудас',
            icon: AppIcons.link,
            child: Column(
              children: [
                for (final r in widget.board.unmatched)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(r.name, style: context.text.titleSmall),
                              Meta(items: [r.code.isEmpty ? 'шифргүй' : r.code, '${scoreText(r.totalScore)} оноо']),
                            ],
                          ),
                        ),
                        TextButton(
                          key: Key('paper-link-${r.sheetId}'),
                          onPressed: _busy ? null : () => _link(r),
                          child: const Text('Сурагч холбох'),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpace.lg),
        TitledCard(
          title: 'Оруулсан түүх',
          icon: AppIcons.history,
          child: history.when(
            loading: () => const SkeletonRows(rows: 2),
            error: (_, _) => Text('Түүхийг ачаалж чадсангүй', style: dim),
            data: (rows) => rows.isEmpty
                ? Text('Одоогоор файл оруулаагүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
                : Column(
                    children: [
                      for (final h in rows)
                        Opacity(
                          opacity: h.reverted ? 0.6 : 1,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(h.fileName, style: context.text.titleSmall),
                                      Meta(
                                        items: [
                                          if (h.createdAt != null)
                                            DateMn.numericWithTime(UbDateTime.fromInstant(h.createdAt!)),
                                          h.createdBy,
                                          '${h.sheetCount} хуудас',
                                          '${h.matchedCount} таарсан',
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                if (h.reverted)
                                  const MetaChip(label: 'Буцаасан')
                                else
                                  TextButton.icon(
                                    key: Key('paper-revert-${h.id}'),
                                    onPressed: _busy ? null : () => _revert(h),
                                    icon: const Icon(AppIcons.restart),
                                    label: const Text('Буцаах'),
                                  ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  Widget _previewCard(BuildContext context, ImportPreview p) {
    final c = context.colors;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    final problems = p.previewRows.where((r) => r.problem).toList();
    final shown = _showAll ? p.previewRows : problems;
    final write = p.writeCount(replace: _replace);
    Widget note(String text, Color color) => Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Text(text, style: context.text.bodyMedium?.copyWith(color: color)),
    );
    return TitledCard(
      title: p.fileName,
      icon: AppIcons.document,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (p.blocking != null) note(p.blocking!, c.error),
          if (p.sameFileImportedAt != null)
            note(
              'Яг энэ файлыг ${DateMn.numericWithTime(UbDateTime.fromInstant(p.sameFileImportedAt!))}-нд оруулсан байна',
              c.warning,
            ),
          if (p.noKeyLetters)
            note(
              'Файлд үсгээр хариулт байна, харин түлхүүр оруулаагүй. Хадгалж болно, түлхүүр оруулахад оноо бодогдоно',
              c.warning,
            ),
          StatRow(
            tiles: [
              StatTile(label: 'Нийт мөр', value: '${p.rows}'),
              StatTile(label: 'Сурагчтай таарсан', value: '${p.matched}', tone: ChipTone.success),
              StatTile(
                label: 'Таараагүй',
                value: '${p.unmatched}',
                tone: p.unmatched > 0 ? ChipTone.warning : ChipTone.neutral,
              ),
              StatTile(label: 'Өмнөх дүнг солих', value: '${p.replaces}'),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          for (final s in p.sheets)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Meta(
                items: [
                  Text(s.groupLabel, style: context.text.titleSmall),
                  if (s.groupTeacher != null) 'Багш: ${s.groupTeacher}',
                  '${s.rowCount} сурагч',
                  '${s.itemCount} бодлого',
                  s.letters ? 'үсгээр' : '1 / хоосон',
                ],
              ),
            ),
          for (final s in p.skipped) Text('«${s.name}» шийтийг алгассан: ${s.reason}', style: dim),
          if (p.replaces > 0)
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _replace,
              onChanged: (v) => setState(() => _replace = v ?? true),
              title: Text('Өмнө оруулсан ${p.replaces} сурагчийн дүнг энэ файлаар солих'),
            ),
          const SizedBox(height: AppSpace.sm),
          Row(
            children: [
              Expanded(
                child: Text(
                  _showAll
                      ? 'Бүх мөр'
                      : problems.isEmpty
                      ? 'Анхаарах мөр алга'
                      : 'Анхаарах ${problems.length} мөр',
                  style: context.text.titleSmall,
                ),
              ),
              TextButton(
                onPressed: () => setState(() => _showAll = !_showAll),
                child: Text(_showAll ? 'Зөвхөн анхаарахыг' : 'Бүгдийг харах'),
              ),
            ],
          ),
          for (final r in shown)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${r.lastName} ${r.firstName}'.trim(), style: context.text.titleSmall),
                        Meta(items: [r.code.isEmpty ? 'шифргүй' : r.code, r.groupLabel, '${r.rowNumber}-р мөр']),
                        if (r.studentName != null)
                          Text(
                            [r.studentName!, if (_matchLabel[r.match] != null) _matchLabel[r.match]!].join(', '),
                            style: dim,
                          )
                        else
                          Text('Олдсонгүй, хадгалсны дараа гараар холбоно', style: dim?.copyWith(color: c.warning)),
                        for (final w in r.warnings) Text(w, style: dim),
                      ],
                    ),
                  ),
                  Text('${scoreText(r.totalScore)}/${scoreText(r.maxScore)}', style: context.text.bodyMedium),
                ],
              ),
            ),
          const SizedBox(height: AppSpace.md),
          FilledButton.icon(
            key: const Key('paper-import-save'),
            onPressed: _busy || p.blocking != null || write <= 0 ? null : () => _send(confirm: true),
            icon: const Icon(AppIcons.cloudUpload),
            label: Text('$write хуудас хадгалах'),
          ),
          TextButton(
            onPressed: _busy
                ? null
                : () => setState(() {
                    _file = null;
                    _preview = null;
                  }),
            child: const Text('Болих'),
          ),
        ],
      ),
    );
  }
}

/// Сурагч хайж холбох (нэр эсвэл сурагчийн код, 2-оос дээш тэмдэгт).
class _LinkSheet extends ConsumerStatefulWidget {
  const _LinkSheet({required this.row});

  final BoardRow row;

  @override
  ConsumerState<_LinkSheet> createState() => _LinkSheetState();
}

class _LinkSheetState extends ConsumerState<_LinkSheet> {
  Timer? _debounce;
  List<FoundStudent>? _found;
  String _q = '';
  bool _busy = false;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _search(String v) {
    _q = v.trim();
    _debounce?.cancel();
    if (_q.length < 2) {
      setState(() => _found = null);
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      final q = _q;
      try {
        final r = await ref.read(paperExamsRepositoryProvider).searchStudents(q);
        if (mounted && q == _q) setState(() => _found = r);
      } catch (_) {
        if (mounted && q == _q) setState(() => _found = const []);
      }
    });
  }

  Future<void> _link(FoundStudent s) async {
    setState(() => _busy = true);
    try {
      await ref.read(paperExamsRepositoryProvider).linkSheet(widget.row.sheetId, s.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        paperSnack(context, paperError(e, 'Холбож чадсангүй'));
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.row;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.lg + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Сурагч холбох', style: context.text.titleLarge),
          Text(
            'Файлд: ${r.name}${r.code.isNotEmpty ? ', шифр ${r.code}' : ''}',
            style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
          ),
          const SizedBox(height: AppSpace.md),
          TextField(
            key: const Key('paper-link-search'),
            autofocus: true,
            onChanged: _search,
            decoration: const InputDecoration(prefixIcon: Icon(AppIcons.search), hintText: 'Нэр эсвэл сурагчийн код'),
          ),
          const SizedBox(height: AppSpace.sm),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 320),
            child: ListView(
              shrinkWrap: true,
              children: [
                if (_found != null && _found!.isEmpty)
                  const Padding(padding: EdgeInsets.all(AppSpace.md), child: Text('Олдсонгүй')),
                for (final s in _found ?? const <FoundStudent>[])
                  ListTile(
                    enabled: !_busy,
                    title: Text(s.name),
                    subtitle: Meta(items: [s.code, s.classes.join(', ')]),
                    onTap: () => _link(s),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
