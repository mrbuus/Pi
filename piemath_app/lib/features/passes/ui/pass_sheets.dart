import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/passes_models.dart';
import '../data/passes_repository.dart';

/// Серверийн монгол мессеж, эсвэл ерөнхий бичвэр.
String passErrorText(Object e, [String fallback = MutationResult.saveFailedMessage]) =>
    e is ApiError ? e.message : fallback;

/// Эрх үүсгэх, засах маягт (вэбийн `PassEditor`). Амжилттай бол серверийн хариу, хаавал `null`.
Future<PassDef?> showPassEditor(BuildContext context, WidgetRef ref, {PassDef? pass}) {
  final repo = ref.read(passesRepositoryProvider);
  final s = pass?.scope;
  return showFormSheet<PassDef>(
    context,
    title: pass == null ? 'Шинэ эрх үүсгэх' : 'Эрхийн мэдээлэл засах',
    submitLabel: pass == null ? 'Эрх үүсгэх' : 'Өөрчлөлт хадгалах',
    fields: [
      FormTextField(name: 'name', label: 'Нэр', initial: pass?.name, required: true, maxLength: 120),
      FormNumberField(
        name: 'days',
        label: 'Хүчинтэй хугацаа',
        initial: pass?.durationDays ?? 30,
        suffixText: 'өдөр',
        required: true,
        min: 1,
        max: 36500,
      ),
      FormMoneyField(
        name: 'price',
        label: 'Үнэ',
        initial: pass?.price,
        min: 0,
        max: 2147483647,
        helper: pass == null ? 'Хоосон бол дурын дүн' : 'Хоосон бол одоогийн үнэ хэвээр',
      ),
      FormSwitchField(name: 'all', label: 'Бүх агуулгад нэвтрэх', initial: s?.all ?? true),
      FormTextField(
        name: 'chapterIds',
        label: 'Бүлгийн ID',
        initial: s?.chapterIds.join(', '),
        maxLines: 3,
        helper: 'Таслал эсвэл шинэ мөрөөр, бүх агуулга сонгосон бол хамаарахгүй',
      ),
      FormTextField(name: 'bookIds', label: 'Номын ID', initial: s?.bookIds.join(', '), maxLines: 3),
      FormTextField(name: 'testIds', label: 'Тестийн ID', initial: s?.testIds.join(', '), maxLines: 3),
    ],
    onSubmit: (v) async {
      final scope = PassScope.fromInput(
        all: v.boolean('all'),
        chapterIds: v.text('chapterIds'),
        bookIds: v.text('bookIds'),
        testIds: v.text('testIds'),
      );
      if (scope.isEmpty) {
        throw const ApiError(
          ApiErrorKind.badRequest,
          'Хамрах бүлэг, ном эсвэл тестийн ID оруулах эсвэл бүх агуулгыг сонгоно уу',
        );
      }
      final draft = PassDraft(
        name: v.text('name'),
        durationDays: v.integer('days') ?? 0,
        price: v.integer('price'),
        scope: scope,
      );
      if (pass == null) return repo.create(draft);
      final saved = await repo.update(pass.id, draft);
      return saved.withHolders(pass.holdersCount);
    },
  );
}

/// Сурагчид эрх олгох (вэбийн «Сурагчид эрх олгох» цонх): нэр, кодоор хайж сонгоод, тэмдэглэлтэй олгоно.
/// Амжилттай бол сонгосон сурагч, хаавал `null`.
Future<PassStudentHit?> showGrantSheet(BuildContext context, PassDef pass) => showModalBottomSheet<PassStudentHit>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (_) => GrantSheet(pass: pass),
);

class GrantSheet extends ConsumerStatefulWidget {
  const GrantSheet({super.key, required this.pass});

  final PassDef pass;

  @override
  ConsumerState<GrantSheet> createState() => _GrantSheetState();
}

class _GrantSheetState extends ConsumerState<GrantSheet> {
  final _query = TextEditingController();
  final _note = TextEditingController();
  Timer? _debounce;
  List<PassStudentHit> _hits = const [];
  PassStudentHit? _selected;
  bool _searching = false;
  bool _busy = false;
  String? _searchError;
  String? _error;
  int _seq = 0;

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    _note.dispose();
    super.dispose();
  }

  void _changed(String text) {
    _debounce?.cancel();
    final q = text.trim();
    setState(() {
      _selected = null;
      _searchError = null;
      if (q.length < 2) {
        _hits = const [];
        _searching = false;
      }
    });
    if (q.length >= 2) _debounce = Timer(const Duration(milliseconds: 250), () => unawaited(_search(q)));
  }

  Future<void> _search(String q) async {
    final seq = ++_seq;
    setState(() => _searching = true);
    try {
      final hits = await ref.read(passesRepositoryProvider).searchStudents(q);
      if (!mounted || seq != _seq) return;
      setState(() {
        _hits = hits;
        _searching = false;
      });
    } catch (e) {
      if (!mounted || seq != _seq) return;
      setState(() {
        _searching = false;
        _searchError = passErrorText(e, 'Хайлт амжилтгүй боллоо');
      });
    }
  }

  Future<void> _grant() async {
    final student = _selected;
    if (student == null || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(passesRepositoryProvider).grant(widget.pass.id, student.id, note: _note.text);
      if (mounted) Navigator.of(context).pop(student);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = passErrorText(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final q = _query.text.trim();
    final empty = q.length >= 2 && !_searching && _searchError == null && _hits.isEmpty;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.85,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Сурагчид эрх олгох', style: context.text.titleMedium),
                    const SizedBox(height: 2),
                    Meta(items: [widget.pass.name, widget.pass.durationLabel]),
                    const SizedBox(height: AppSpace.lg),
                    TextField(
                      key: const ValueKey('grant:search'),
                      controller: _query,
                      autofocus: true,
                      enabled: !_busy,
                      textInputAction: TextInputAction.search,
                      decoration: const InputDecoration(
                        prefixIcon: Icon(AppIcons.search),
                        labelText: 'Сурагчийг нэр эсвэл кодоор хайх',
                        hintText: 'Дор хаяж 2 тэмдэгт',
                      ),
                      onChanged: _changed,
                    ),
                    if (q.isNotEmpty && q.length < 2)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpace.sm),
                        child: Text(
                          'Хайхын тулд дор хаяж 2 тэмдэгт оруулна уу',
                          style: context.text.bodySmall?.copyWith(color: c.inkDim),
                        ),
                      ),
                    const SizedBox(height: AppSpace.sm),
                    if (_searching) const LinearProgressIndicator(minHeight: 2),
                    if (_searchError != null)
                      Text(_searchError!, style: context.text.bodyMedium?.copyWith(color: c.error)),
                    if (empty)
                      Text('Тохирох сурагч олдсонгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                  ],
                ),
              ),
            ),
            SliverList.builder(
              itemCount: _hits.length,
              itemBuilder: (context, i) {
                final h = _hits[i];
                final selected = _selected?.id == h.id;
                return ListTile(
                  key: ValueKey('grant:hit:${h.id}'),
                  minTileHeight: 56,
                  selected: selected,
                  leading: const Icon(AppIcons.user),
                  title: Text(h.name),
                  subtitle: Text(h.studentCode ?? 'Кодгүй'),
                  trailing: selected ? Icon(AppIcons.check, color: c.success) : null,
                  onTap: _busy ? null : () => setState(() => _selected = h),
                );
              },
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xl),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_selected != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpace.md),
                        child: Text('Сонгосон сурагч: ${_selected!.name}', style: context.text.bodyMedium),
                      ),
                    TextField(
                      key: const ValueKey('grant:note'),
                      controller: _note,
                      enabled: !_busy,
                      maxLength: 500,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: 'Олголтын тэмдэглэл (сонголттой)'),
                    ),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: AppSpace.sm),
                        child: Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
                      ),
                    const SizedBox(height: AppSpace.sm),
                    FilledButton(
                      key: const ValueKey('grant:submit'),
                      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                      onPressed: _selected == null || _busy ? null : () => unawaited(_grant()),
                      child: Text(_busy ? 'Олгож байна' : 'Эрх олгох'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
