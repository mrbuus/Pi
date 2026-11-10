import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/draft_models.dart';
import '../data/draft_repository.dart';
import 'draft_ui.dart';

/// Word импорт (`/app/import`, вэбийн `WordImportClient`) — Админ, Багш+. Утаснаас `.docx` сонгож урьдчилан
/// харна (OMML томьёо → LaTeX), нөхцөл, сонголт, зөв хариуг заагаад бүлэгт нэг бодлого хадгална.
/// Олон бодлоготой файлыг «Бодлогын ноорог»-оор оруулах нь илүү хурдан.
class WordImportScreen extends ConsumerStatefulWidget {
  const WordImportScreen({super.key});

  static const path = '/app/import';

  @override
  ConsumerState<WordImportScreen> createState() => _WordImportScreenState();
}

class _WordImportScreenState extends ConsumerState<WordImportScreen> {
  WordPreview? _preview;
  String? _prompt;
  final _choices = <String>[];
  String? _correct;
  DraftChapterRef? _chapter;
  bool _confirmed = false;
  bool _busy = false;
  String? _error;
  String? _done;

  DraftRepository get _repo => ref.read(draftRepositoryProvider);

  WordBlock? _block(String? id) => _preview?.blocks.where((b) => b.id == id).firstOrNull;

  void _reset() {
    _prompt = null;
    _choices.clear();
    _correct = null;
    _confirmed = false;
    _done = null;
  }

  Future<void> _pick() async {
    final f = await ref.read(docxPickerProvider).pick();
    if (f == null || !mounted) return;
    if (!f.name.toLowerCase().endsWith('.docx') || f.bytes.length > 10 * 1024 * 1024) {
      setState(() => _error = '10 МБ-аас ихгүй .docx файл сонгоно уу');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _preview = null;
      _reset();
    });
    try {
      final p = await _repo.wordPreview(f.bytes, f.name);
      if (mounted) setState(() => _preview = p);
    } catch (e) {
      if (mounted) setState(() => _error = draftError(e, 'Баримтыг уншиж чадсангүй'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<SelectOption<String>> _options({Set<String> exclude = const {}}) => [
    for (final b in _preview?.blocks ?? const <WordBlock>[])
      if (!exclude.contains(b.id) && b.warnings.isEmpty)
        SelectOption(b.id, b.text.length > 100 ? '${b.text.substring(0, 100)}...' : b.text),
  ];

  Future<void> _pickChapter() async {
    List<DraftChapterRef> chapters;
    try {
      chapters = await _repo.allChapters();
    } catch (e) {
      if (mounted) draftSnack(context, draftError(e, 'Бүлгийн жагсаалтыг ачаалж чадсангүй'));
      return;
    }
    if (!mounted) return;
    final id = await pickOne<String>(context, 'Бүлэг сэдэв', [
      for (final c in chapters) SelectOption(c.id, c.title, subtitle: c.bookTitle),
    ], selected: _chapter?.id);
    if (id != null && mounted) {
      setState(() {
        _chapter = chapters.firstWhere((c) => c.id == id);
        _confirmed = false;
        _done = null;
      });
    }
  }

  bool get _valid =>
      _prompt != null && _choices.length >= 2 && _correct != null && _choices.contains(_correct) && _chapter != null;

  Future<void> _save() async {
    if (!_valid || !_confirmed || _preview == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final r = await _repo.wordConfirm(
        token: _preview!.token,
        chapterId: _chapter!.id,
        promptId: _prompt!,
        choiceIds: [..._choices],
        correctId: _correct!,
      );
      if (mounted) {
        setState(() => _done = r.duplicate ? 'Ийм бодлого бүлэгт аль хэдийн байна' : 'Бодлого бүлэгт хадгалагдлаа');
      }
    } catch (e) {
      if (mounted) setState(() => _error = draftError(e, 'Бодлогыг хадгалж чадсангүй'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!ref.watch(draftAccessProvider)) {
      return Scaffold(
        appBar: AppBar(title: const Text('Word импорт')),
        body: const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden),
      );
    }
    final p = _preview;
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(title: const Text('Word импорт')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          FilledButton.icon(
            onPressed: _busy ? null : _pick,
            icon: const Icon(AppIcons.document, size: 18),
            label: Text(p == null ? '.docx файл сонгох' : 'Өөр файл сонгох'),
          ),
          if (_busy && p == null)
            const Padding(
              padding: EdgeInsets.only(top: AppSpace.lg),
              child: LoadingState(cards: 2),
            ),
          if (_error != null) ...[
            const SizedBox(height: AppSpace.sm),
            Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
          ],
          if (p != null) ...[
            const SizedBox(height: AppSpace.md),
            Meta(items: [p.filename, '${p.blocks.length} мөр', '${p.equationCount} томьёо']),
            for (final w in p.warnings)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.xs),
                child: Text(w, style: context.text.bodySmall?.copyWith(color: c.warning)),
              ),
            const SectionHeader(title: 'Бодлого угсрах'),
            AppCard(
              padding: EdgeInsets.zero,
              child: RadioGroup<String>(
                groupValue: _correct,
                onChanged: (v) => setState(() {
                  _correct = v;
                  _confirmed = false;
                }),
                child: Column(
                  children: [
                    ListTile(
                      minTileHeight: AppSizes.minTap,
                      title: const Text('Нөхцөл'),
                      subtitle: _block(_prompt) == null ? const Text('Сонгоно уу') : MathText(_block(_prompt)!.text),
                      trailing: const Icon(AppIcons.expand),
                      onTap: () async {
                        final id = await pickOne(context, 'Нөхцөл', _options(), selected: _prompt);
                        if (id != null) {
                          setState(() {
                            _prompt = id;
                            _choices.remove(id);
                            _confirmed = false;
                            _done = null;
                          });
                        }
                      },
                    ),
                    Divider(height: 1, color: c.line),
                    for (var i = 0; i < _choices.length; i++)
                      ListTile(
                        minTileHeight: AppSizes.minTap,
                        leading: Radio<String>(value: _choices[i]),
                        title: MathText(_block(_choices[i])?.text ?? ''),
                        subtitle: Text(
                          '${draftLetters[i]} сонголт${_correct == _choices[i] ? ', зөв хариу' : ''}',
                          style: context.text.bodySmall?.copyWith(
                            color: _correct == _choices[i] ? c.success : c.inkDim,
                          ),
                        ),
                        trailing: IconButton(
                          tooltip: 'Сонголт хасах',
                          icon: const Icon(AppIcons.circleMinus),
                          onPressed: () => setState(() {
                            if (_correct == _choices[i]) _correct = null;
                            _choices.removeAt(i);
                            _confirmed = false;
                          }),
                        ),
                      ),
                    if (_choices.length < 5)
                      ListTile(
                        minTileHeight: AppSizes.minTap,
                        leading: const Icon(AppIcons.add),
                        title: const Text('Сонголт нэмэх'),
                        onTap: () async {
                          final id = await pickOne(
                            context,
                            '${draftLetters[_choices.length]} сонголт',
                            _options(exclude: {?_prompt, ..._choices}),
                          );
                          if (id != null) {
                            setState(() {
                              _choices.add(id);
                              _confirmed = false;
                            });
                          }
                        },
                      ),
                    Divider(height: 1, color: c.line),
                    ListTile(
                      minTileHeight: AppSizes.minTap,
                      title: const Text('Бүлэг сэдэв'),
                      subtitle: Text(_chapter?.title ?? 'Сонгоно уу'),
                      trailing: const Icon(AppIcons.expand),
                      onTap: _pickChapter,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            CheckboxListTile(
              value: _confirmed,
              onChanged: _valid ? (v) => setState(() => _confirmed = v ?? false) : null,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text('Нөхцөл, сонголт, зөв хариуг шалгасан'),
            ),
            FilledButton(
              onPressed: _busy || !_valid || !_confirmed ? null : _save,
              child: Text(_busy ? 'Хадгалж байна' : 'Бүлэгт хадгалах'),
            ),
            if (_done != null) ...[
              const SizedBox(height: AppSpace.sm),
              Text(_done!, style: context.text.bodyMedium?.copyWith(color: c.success)),
            ],
            const SectionHeader(title: 'Баримтын мөрүүд'),
            for (final b in p.blocks)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.xs),
                child: AppCard(
                  padding: const EdgeInsets.all(AppSpace.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MathText(b.text),
                      for (final w in b.warnings) Text(w, style: context.text.bodySmall?.copyWith(color: c.warning)),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}
