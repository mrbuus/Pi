import 'dart:typed_data';

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../application/students_admin_providers.dart';
import '../data/students_admin_models.dart';
import '../data/students_admin_repository.dart';

/// Сонгосон файл.
class PickedFile {
  const PickedFile({required this.name, required this.bytes});

  final String name;
  final Uint8List bytes;
}

/// Утасны файлаас `.xlsx` сонгох. `null` = хэрэглэгч болисон.
abstract class XlsxPicker {
  const XlsxPicker();

  /// Энэ хувилбарт файл сонгох боломжтой эсэх.
  bool get available;

  Future<PickedFile?> pick();
}

/// Файл сонгох сан (`file_picker` эсвэл `file_selector`) апп-д хараахан нэмэгдээгүй — `pubspec`-д нэмэгдэхэд
/// [xlsxPickerProvider]-ийг жинхэнэ хэрэгжүүлэлтээр солино (`docs` — тайлан).
class UnavailableXlsxPicker extends XlsxPicker {
  const UnavailableXlsxPicker();

  @override
  bool get available => false;

  @override
  Future<PickedFile?> pick() async => null;
}

/// Утасны файл сонгогч (`file_selector`, Flutter-ийн албан ёсны сан): Android — MIME, iOS — UTI.
class FileSelectorXlsxPicker extends XlsxPicker {
  const FileSelectorXlsxPicker();

  static const _group = XTypeGroup(
    label: 'Excel',
    extensions: ['xlsx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    uniformTypeIdentifiers: ['org.openxmlformats.spreadsheetml.sheet'],
  );

  @override
  bool get available => true;

  @override
  Future<PickedFile?> pick() async {
    final file = await openFile(acceptedTypeGroups: const [_group]);
    if (file == null) return null;
    return PickedFile(name: file.name, bytes: await file.readAsBytes());
  }
}

final xlsxPickerProvider = Provider<XlsxPicker>((ref) => const FileSelectorXlsxPicker());

/// Серверийн хязгаар (`FileInterceptor` 5 MB).
const maxImportBytes = 5 * 1024 * 1024;

/// `/app/admin/students/import` — Excel-ээс сурагч оруулах (Админ, вэбийн `admin/students/import`):
/// файл сонгох → урьдчилан харах (хадгалахгүй) → мөр сонгох → 100-аар багцалж хадгалах.
class StudentImportScreen extends ConsumerStatefulWidget {
  const StudentImportScreen({super.key});

  @override
  ConsumerState<StudentImportScreen> createState() => _StudentImportScreenState();
}

enum _Retry { inspect, commit }

class _StudentImportScreenState extends ConsumerState<StudentImportScreen> {
  PickedFile? _file;
  ImportPreview? _preview;
  final _selected = <int>{};
  bool _busy = false;
  String? _error;
  String? _message;
  _Retry _retry = _Retry.inspect;

  StudentsAdminRepository get _repo => ref.read(studentsAdminRepositoryProvider);

  Future<void> _pick() async {
    final picker = ref.read(xlsxPickerProvider);
    if (!picker.available) {
      setState(() => _error = 'Энэ хувилбарт утаснаас файл сонгох боломж хараахан алга. Апп шинэчлэгдэхэд нээгдэнэ');
      return;
    }
    final f = await picker.pick();
    if (f == null || !mounted) return;
    setState(() {
      _preview = null;
      _message = null;
      _selected.clear();
      if (!f.name.toLowerCase().endsWith('.xlsx')) {
        _file = null;
        _error = 'Зөвхөн .xlsx файл сонгоно уу';
      } else if (f.bytes.length > maxImportBytes) {
        _file = null;
        _error = 'Файл 5 MB-аас их байна';
      } else {
        _file = f;
        _error = null;
      }
    });
  }

  Future<void> _inspect() async {
    final f = _file;
    if (f == null || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
      _preview = null;
      _retry = _Retry.inspect;
    });
    try {
      final p = await _repo.importPreview(f.bytes, f.name);
      if (!mounted) return;
      setState(() {
        _preview = p;
        _selected
          ..clear()
          ..addAll(p.selectable);
      });
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiError ? e.message : 'Файлыг уншиж чадсангүй');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _commit() async {
    final p = _preview;
    if (p == null || _selected.isEmpty || _busy) return;
    final rows = _selected.toList()..sort();
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
      _retry = _Retry.commit;
    });
    try {
      final n = await _repo.importCommitAll(p.previewId, rows);
      if (!mounted) return;
      ref.read(studentsListVersionProvider.notifier).bump();
      setState(() {
        _message = '$n мөр хадгаллаа';
        _preview = null;
        _file = null;
        _selected.clear();
      });
    } on ImportCommitError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiError ? e.message : 'Импорт амжилтгүй боллоо');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = _preview;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    if (!ref.watch(studentsPermsProvider).canImport) {
      return Scaffold(
        appBar: AppBar(title: const Text('Excel-ээс сурагч оруулах')),
        body: const EmptyState(icon: AppIcons.secure, title: 'Excel импорт зөвхөн Админд'),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Excel-ээс сурагч оруулах')),
      body: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.all(AppSpace.gutter),
            sliver: SliverList.list(
              children: [
                Text(
                  'Овог, Нэр, Утас багана шаардлагатай. Эцэг эхийн утас, Анги/Түвшин сонголттой. '
                  'Нууц үг сурагчийн утас болно. Архивлагдсан бүртгэлийг эхлээд сэргээнэ үү',
                  style: dim,
                ),
                const SizedBox(height: AppSpace.md),
                OutlinedButton.icon(
                  key: const ValueKey('import-pick'),
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56)),
                  onPressed: _busy ? null : _pick,
                  icon: const Icon(AppIcons.document),
                  label: Text(_file?.name ?? '.xlsx файл сонгох (5 MB хүртэл)', overflow: TextOverflow.ellipsis),
                ),
                const SizedBox(height: AppSpace.sm),
                FilledButton.icon(
                  key: const ValueKey('import-inspect'),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                  onPressed: _file == null || _busy ? null : _inspect,
                  icon: const Icon(AppIcons.cloudUpload, size: 18),
                  label: const Text('Урьдчилан харах'),
                ),
                if (_busy) ...[const SizedBox(height: AppSpace.md), const LinearProgressIndicator()],
                if (_error != null) ...[
                  const SizedBox(height: AppSpace.md),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
                        if (_file != null || p != null)
                          TextButton.icon(
                            style: TextButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
                            onPressed: _busy ? null : (_retry == _Retry.commit ? _commit : _inspect),
                            icon: const Icon(AppIcons.retry, size: 18),
                            label: const Text(AppStrings.retry),
                          ),
                      ],
                    ),
                  ),
                ],
                if (_message != null) ...[
                  const SizedBox(height: AppSpace.md),
                  Semantics(
                    liveRegion: true,
                    child: AppCard(
                      child: Row(
                        children: [
                          Icon(AppIcons.success, color: c.success),
                          const SizedBox(width: AppSpace.sm),
                          Expanded(child: Text(_message!, style: context.text.bodyMedium)),
                        ],
                      ),
                    ),
                  ),
                ],
                if (p != null) ...[
                  const SizedBox(height: AppSpace.lg),
                  Text('Шалгасан мөрүүд', style: context.text.titleMedium),
                  const SizedBox(height: AppSpace.xs),
                  Meta(
                    style: dim,
                    items: [
                      'Шинэ ${p.count(ImportRowStatus.create)}',
                      'шинэчлэх ${p.count(ImportRowStatus.update)}',
                      'алдаа ${p.count(ImportRowStatus.error)}',
                      'урьдчилан харах 15 минут хүчинтэй',
                    ],
                  ),
                  const SizedBox(height: AppSpace.xs),
                  Text('Сонгосон мөрүүдийг 100 хүртэлх багцаар дараалуулан хадгална', style: dim),
                  const SizedBox(height: AppSpace.sm),
                  FilledButton(
                    key: const ValueKey('import-commit'),
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                    onPressed: _busy || _selected.isEmpty ? null : _commit,
                    child: Text(_busy ? 'Хадгалж байна' : '${_selected.length} мөр хадгалах'),
                  ),
                ],
              ],
            ),
          ),
          if (p != null)
            SliverList.builder(
              itemCount: p.rows.length,
              itemBuilder: (context, i) {
                final r = p.rows[i];
                final error = r.status == ImportRowStatus.error;
                return CheckboxListTile(
                  key: ValueKey('row:${r.rowNumber}'),
                  minTileHeight: AppSizes.minTap,
                  controlAffinity: ListTileControlAffinity.leading,
                  value: _selected.contains(r.rowNumber),
                  onChanged: error || _busy
                      ? null
                      : (v) => setState(() => v == true ? _selected.add(r.rowNumber) : _selected.remove(r.rowNumber)),
                  title: Text(r.name.isEmpty ? '${r.rowNumber}-р мөр' : r.name, style: context.text.titleSmall),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Meta(
                        style: dim,
                        items: ['${r.rowNumber}-р мөр', r.phone, r.classroomLabel.isEmpty ? null : r.classroomLabel],
                      ),
                      Text(r.status.label, style: context.text.labelMedium?.copyWith(color: error ? c.error : c.ink)),
                      if (r.reason != null) Text(r.reason!, style: context.text.bodySmall?.copyWith(color: c.error)),
                    ],
                  ),
                );
              },
            ),
          SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl + MediaQuery.viewPaddingOf(context).bottom)),
        ],
      ),
    );
  }
}
