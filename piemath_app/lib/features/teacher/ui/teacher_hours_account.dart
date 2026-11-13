import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/teacher_hours_sheet.dart';
import '../domain/teacher_hours_logic.dart';

/// Багшийн цалингийн данс (вэбийн `teacher-hours/AccountDrawer.tsx`, эзэн 2026-11-08). Хүснэгтэд нэр дээр
/// эсвэл «Миний данс»-аар нээгдэнэ. Бүх ажилтан харна; засах эрхийг сервер шийднэ (`canEdit`) — энд зөвхөн
/// товчийг нууна. Хадгалбал `true`.
Future<bool> showTeacherAccountSheet(BuildContext context, {required String teacherId, required String name}) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => TeacherAccountSheet(teacherId: teacherId, name: name),
  );
  return saved == true;
}

class TeacherAccountSheet extends ConsumerStatefulWidget {
  const TeacherAccountSheet({super.key, required this.teacherId, required this.name});

  final String teacherId;
  final String name;

  @override
  ConsumerState<TeacherAccountSheet> createState() => _TeacherAccountSheetState();
}

const _otherBank = '__other';

class _TeacherAccountSheetState extends ConsumerState<TeacherAccountSheet> {
  /// null = автомат (данс байхгүй, засах эрхтэй бол шууд маягт).
  bool? _editing;
  String _bank = '';
  final _otherName = TextEditingController();
  final _number = TextEditingController();
  final _holder = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _otherName.dispose();
    _number.dispose();
    _holder.dispose();
    super.dispose();
  }

  void _startEdit(TeacherAccount a) {
    final prev = a.bankName ?? '';
    final known = teacherBanks.contains(prev);
    _bank = prev.isEmpty ? '' : (known ? prev : _otherBank);
    _otherName.text = known ? '' : prev;
    _number.text = a.accountNumber ?? '';
    _holder.text = a.holderName ?? a.fullName.replaceFirst(RegExp(r'\+$'), '');
    _error = null;
    _editing = true;
  }

  String get _bankName => _bank == _otherBank ? _otherName.text.trim() : _bank;

  bool get _ready => accountFormReady(bankName: _bankName, number: _number.text, holder: _holder.text);

  Future<void> _pickBank() async {
    final picked = await showSelectSheet<String>(
      context,
      title: 'Банк',
      selected: _bank,
      options: [for (final b in teacherBanks) SelectOption(b, b), const SelectOption(_otherBank, 'Бусад банк')],
    );
    if (picked != null && mounted) setState(() => _bank = picked.value);
  }

  Future<void> _save() async {
    if (!_ready || _busy) return;
    final repo = ref.read(teacherHoursSheetRepositoryProvider);
    final messenger = ScaffoldMessenger.maybeOf(context);
    final nav = Navigator.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await repo.setAccount(
        widget.teacherId,
        bankName: _bankName,
        accountNumber: _number.text,
        holderName: _holder.text,
      );
      ref.invalidate(teacherAccountProvider(widget.teacherId));
      messenger?.showSnackBar(const SnackBar(content: Text('Данс хадгалагдлаа')));
      nav.pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e is ApiError ? e.message : MutationResult.saveFailedMessage;
        });
      }
    }
  }

  Future<void> _copy(String value) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    await Clipboard.setData(ClipboardData(text: value));
    messenger?.showSnackBar(const SnackBar(content: Text('Дансны дугаар хуулагдлаа')));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final async = ref.watch(teacherAccountProvider(widget.teacherId));
    final a = async.value;
    if (a != null && _editing == null && !a.hasAccount && a.canEdit) _startEdit(a);
    final editing = a != null && _editing == true;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(AppIcons.bank, color: c.brand),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(header: true, child: Text(a?.fullName ?? widget.name, style: context.text.titleLarge)),
                      Text('Цалингийн данс', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.lg),
            if (a == null)
              async.hasError
                  ? ErrorState(
                      message: async.error is ApiError ? (async.error! as ApiError).message : AppStrings.genericError,
                      onRetry: () => ref.invalidate(teacherAccountProvider(widget.teacherId)),
                    )
                  : const LoadingState(cards: 1, padding: EdgeInsets.zero)
            else if (editing)
              ..._form(context)
            else
              ..._view(context, a),
          ],
        ),
      ),
    );
  }

  List<Widget> _view(BuildContext context, TeacherAccount a) {
    final c = context.colors;
    Widget field(String label, Widget value) => Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          value,
        ],
      ),
    );
    return [
      if (a.hasAccount)
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              field('Банк', Text(a.bankName ?? '', style: context.text.titleSmall)),
              field(
                'Дансны дугаар',
                Row(
                  children: [
                    Expanded(
                      child: SelectableText(
                        a.accountNumber!,
                        key: const ValueKey('account:number'),
                        style: context.text.titleLarge?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Дансны дугаар хуулах',
                      icon: const Icon(AppIcons.copy),
                      onPressed: () => unawaited(_copy(a.accountNumber!)),
                    ),
                  ],
                ),
              ),
              field('Данс эзэмшигч', Text(a.holderName ?? '', style: context.text.titleSmall)),
            ],
          ),
        )
      else
        AppCard(
          child: Text(
            a.isSelf ? 'Та дансаа хараахан оруулаагүй байна' : 'Данс хараахан оруулаагүй байна',
            style: context.text.bodyMedium?.copyWith(color: c.inkDim),
          ),
        ),
      if (a.canEdit) ...[
        const SizedBox(height: AppSpace.md),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: OutlinedButton.icon(
            key: const ValueKey('account:edit'),
            onPressed: () => setState(() => _startEdit(a)),
            icon: const Icon(AppIcons.pencilLine, size: 18),
            label: Text(a.hasAccount ? 'Данс засах' : 'Данс оруулах'),
          ),
        ),
      ],
    ];
  }

  List<Widget> _form(BuildContext context) {
    final c = context.colors;
    final a = ref.read(teacherAccountProvider(widget.teacherId)).value;
    final bankLabel = _bank == _otherBank ? 'Бусад банк' : (_bank.isEmpty ? 'Банкаа сонгоно уу' : _bank);
    return [
      Text('Банк', style: context.text.labelLarge),
      const SizedBox(height: AppSpace.xs),
      AppCard(
        padding: EdgeInsets.zero,
        child: ListTile(
          key: const ValueKey('account:bank'),
          minTileHeight: AppSizes.minTap,
          title: Text(bankLabel, style: TextStyle(color: _bank.isEmpty ? c.inkDim : c.ink)),
          trailing: const Icon(AppIcons.expand),
          onTap: () => unawaited(_pickBank()),
        ),
      ),
      if (_bank == _otherBank) ...[
        const SizedBox(height: AppSpace.md),
        TextField(
          key: const ValueKey('account:other-bank'),
          controller: _otherName,
          maxLength: 60,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(labelText: 'Банкны нэр', counterText: ''),
        ),
      ],
      const SizedBox(height: AppSpace.md),
      TextField(
        key: const ValueKey('account:number-field'),
        controller: _number,
        maxLength: 40,
        keyboardType: TextInputType.number,
        autocorrect: false,
        onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(labelText: 'Дансны дугаар', hintText: 'ж: 5012345678', counterText: ''),
      ),
      const SizedBox(height: AppSpace.md),
      TextField(
        key: const ValueKey('account:holder'),
        controller: _holder,
        maxLength: 80,
        onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(labelText: 'Данс эзэмшигч', counterText: ''),
      ),
      if (_error != null) ...[
        const SizedBox(height: AppSpace.sm),
        Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
      ],
      const SizedBox(height: AppSpace.lg),
      Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          if (a?.hasAccount ?? false) ...[
            OutlinedButton(
              onPressed: _busy ? null : () => setState(() => _editing = false),
              child: const Text(AppStrings.cancel),
            ),
            const SizedBox(width: AppSpace.sm),
          ],
          FilledButton(
            key: const ValueKey('account:save'),
            onPressed: !_ready || _busy ? null : () => unawaited(_save()),
            child: Text(_busy ? 'Хадгалж байна' : AppStrings.save),
          ),
        ],
      ),
    ];
  }
}
