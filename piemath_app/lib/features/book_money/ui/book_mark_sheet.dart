import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../data/book_money_models.dart';
import '../data/book_money_repository.dart';
import '../domain/book_money_logic.dart';

/// Алдааны мессеж: серверийн монгол бичвэр, эс бөгөөс [fallback].
String bookError(Object e, [String fallback = 'Хадгалж чадсангүй. Дахин оролдоно уу']) =>
    e is ApiError && e.kind != ApiErrorKind.unknown && e.message.trim().isNotEmpty ? e.message : fallback;

void bookSnack(BuildContext context, String m) => ScaffoldMessenger.maybeOf(context)
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(m)));

/// [showBookMarkSheet]-ийн оролт — ангийн номын чек, сурагчийн «Ном» таб хоёулаа хэрэглэнэ.
@immutable
class BookSheetTarget {
  const BookSheetTarget({
    required this.studentId,
    required this.studentName,
    required this.bookTitle,
    this.price,
    this.status,
    this.amount,
    this.collectedBy,
    this.note,
    this.classrooms,
    this.classroomId,
    this.lockedClassName,
  });

  final String studentId;
  final String studentName;
  final String bookTitle;

  /// Анхдагч дүн (чекийн үнэ / санал болгох үнэ).
  final int? price;
  final BookStatus? status;
  final int? amount;
  final BookPerson? collectedBy;
  final String? note;

  /// Зөвхөн сурагчийн хуудсанд: «Аль ангид байхдаа өгсөн» сонгоно.
  final List<BookClassroom>? classrooms;
  final String? classroomId;

  /// Өөр ангид төлсөн — ангийн чекээс засахгүй, зөвхөн харуулна.
  final String? lockedClassName;
}

/// Номын мөнгөний дэлгэрэнгүй тэмдэглэгээ (вэбийн `BookMarkSheet`, эзэн 2026-11-12): гол нь ХЭН АВСАН —
/// багш нарын нэр шууд товчоор (эзний дарааллаар), нэрээ дараад «Батлах». Дүн, тайлбар доор нь;
/// «Авахгүй», «Арилгах». [onSave] амжилттай бол хуудас хаагдана, алдаа гарвал хуудсан дотор харагдана.
///
/// Ангийн номын чекээс: `onSave: (input) => markStudent(input.toCheckMarkBody())`.
Future<void> showBookMarkSheet(
  BuildContext context, {
  required BookSheetTarget target,
  required Future<void> Function(BookMarkInput input) onSave,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (_) => BookMarkSheet(target: target, onSave: onSave),
);

class BookMarkSheet extends ConsumerStatefulWidget {
  const BookMarkSheet({super.key, required this.target, required this.onSave});

  final BookSheetTarget target;
  final Future<void> Function(BookMarkInput input) onSave;

  @override
  ConsumerState<BookMarkSheet> createState() => _BookMarkSheetState();
}

class _BookMarkSheetState extends ConsumerState<BookMarkSheet> {
  static const _noClass = '__none__';

  late final TextEditingController _amount;
  late final TextEditingController _note;
  late String _classroom;

  /// `null` = сонгоогүй: жагсаалт ирмэгц нэвтэрсэн хүн (өмнө тэмдэглэсэн бол тэр багш).
  String? _picked;
  bool _busy = false;
  String? _error;

  BookSheetTarget get t => widget.target;

  @override
  void initState() {
    super.initState();
    final n = t.status == BookStatus.paid ? t.amount : t.price;
    _amount = TextEditingController(text: n == null ? '' : ThousandsFormatter.format(n));
    _note = TextEditingController(text: t.note ?? '');
    _picked = t.collectedBy?.id;
    _classroom = t.classroomId ?? (t.classrooms?.isNotEmpty == true ? t.classrooms!.first.id : _noClass);
  }

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  String? get _cleanNote {
    final s = _note.text.replaceAll(RegExp(r'\s+'), ' ').trim();
    return s.isEmpty ? null : s;
  }

  bool get _sendClassroom => t.classrooms != null;
  String? get _classroomValue => _classroom == _noClass ? null : _classroom;

  Future<void> _run(BookMarkInput input) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSave(input);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = bookError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _confirm(String? collector) {
    final amount = parseAmountInput(_amount.text);
    final err = amountError(amount);
    if (err != null) {
      setState(() => _error = err);
      return;
    }
    _run(
      BookMarkInput.paid(
        amount: amount!,
        collectedById: collector,
        classroomId: _classroomValue,
        setClassroom: _sendClassroom,
        note: _cleanNote,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.lg + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(t.studentName, style: context.text.titleLarge),
            const SizedBox(height: 2),
            Text(
              [t.bookTitle, if (t.price != null) formatMnt(t.price!)].join(', '),
              style: context.text.bodyMedium?.copyWith(color: c.inkDim),
            ),
            const SizedBox(height: AppSpace.lg),
            if (t.lockedClassName != null) ..._locked(context) else ..._form(context),
          ],
        ),
      ),
    );
  }

  List<Widget> _locked(BuildContext context) {
    final c = context.colors;
    return [
      DecoratedBox(
        decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.md)),
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.md),
          child: Text(
            [
              '${t.lockedClassName} ангид байхдаа төлсөн',
              if (t.collectedBy != null) '${t.collectedBy!.display} авсан',
              if (t.amount != null) formatMnt(t.amount!),
            ].join(', '),
            style: context.text.bodyMedium,
          ),
        ),
      ),
      const SizedBox(height: AppSpace.md),
      Align(
        alignment: AlignmentDirectional.centerStart,
        child: TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            context.push('/app/students/${Uri.encodeComponent(t.studentId)}');
          },
          child: const Text('Сурагчийн хуудаснаас засах'),
        ),
      ),
    ];
  }

  List<Widget> _form(BuildContext context) {
    final c = context.colors;
    final collectors = ref.watch(bookCollectorsProvider);
    final list = collectors.value;
    final collector = _picked ?? list?.me;
    final chips = list == null
        ? const <({BookPerson person, String label})>[]
        : collectorChips(list.staff, t.collectedBy);
    return [
      Text('Мөнгийг авсан багш', style: context.text.titleSmall),
      const SizedBox(height: AppSpace.sm),
      if (collectors.isLoading && list == null)
        const SkeletonBox(height: 96)
      else if (collectors.hasError && list == null)
        Text('Багш нарын жагсаалтыг ачаалж чадсангүй', style: context.text.bodySmall?.copyWith(color: c.error))
      else
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            for (final ch in chips)
              ChoiceChip(
                label: Text(ch.label),
                selected: ch.person.id == collector,
                showCheckmark: false,
                materialTapTargetSize: MaterialTapTargetSize.padded,
                onSelected: _busy ? null : (_) => setState(() => _picked = ch.person.id),
              ),
          ],
        ),
      const SizedBox(height: AppSpace.lg),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: TextField(
              key: const Key('book-amount'),
              controller: _amount,
              enabled: !_busy,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(7),
                const ThousandsFormatter(),
              ],
              decoration: const InputDecoration(labelText: 'Дүн', hintText: '40,000', suffixText: '₮'),
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: TextField(
              key: const Key('book-note'),
              controller: _note,
              enabled: !_busy,
              maxLength: kBookNoteMax,
              decoration: const InputDecoration(labelText: 'Тайлбар', counterText: ''),
            ),
          ),
        ],
      ),
      if (t.classrooms != null) ...[
        const SizedBox(height: AppSpace.md),
        DropdownButtonFormField<String>(
          initialValue: _classroom,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Аль ангид байхдаа өгсөн'),
          items: [
            for (final cl in t.classrooms!)
              DropdownMenuItem(value: cl.id, child: Text(cl.current ? cl.name : '${cl.name} (өмнөх анги)')),
            const DropdownMenuItem(value: _noClass, child: Text('Ангигүй')),
          ],
          onChanged: _busy ? null : (v) => setState(() => _classroom = v ?? _noClass),
        ),
      ],
      if (_error != null) ...[
        const SizedBox(height: AppSpace.md),
        Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
      ],
      const SizedBox(height: AppSpace.lg),
      FilledButton.icon(
        key: const Key('book-confirm'),
        onPressed: _busy ? null : () => _confirm(collector),
        icon: const Icon(AppIcons.check),
        label: const Text('Батлах'),
      ),
      const SizedBox(height: AppSpace.xs),
      Wrap(
        alignment: WrapAlignment.center,
        spacing: AppSpace.sm,
        children: [
          if (t.status != BookStatus.skipped)
            TextButton.icon(
              onPressed: _busy
                  ? null
                  : () => _run(
                      BookMarkInput.skipped(
                        classroomId: _classroomValue,
                        setClassroom: _sendClassroom,
                        note: _cleanNote,
                      ),
                    ),
              icon: const Icon(AppIcons.ban),
              label: const Text('Авахгүй'),
            ),
          if (t.status != null)
            TextButton.icon(
              onPressed: _busy ? null : () => _run(const BookMarkInput.none()),
              icon: const Icon(AppIcons.eraser),
              label: const Text('Арилгах'),
            ),
        ],
      ),
    ];
  }
}
