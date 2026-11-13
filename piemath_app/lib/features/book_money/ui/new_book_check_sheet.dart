import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../data/book_money_models.dart';
import '../data/book_money_repository.dart';
import '../domain/book_money_logic.dart';
import 'book_mark_sheet.dart';

/// Ангийн самбарын «Чек → Шинэ чек»-ийн ном/хариултын хуудасны хэсэг (вэбийн `ClassChecksPanel.CheckForm`,
/// `chooseKind`): ном эсвэл «Нэгдсэн шалгалт», «Ангийн шалгалт»-ыг сонгоод үнээ оруулна. Хуудасны
/// дугаарыг сервер өгнө; нэг ангид нэг номын ганц чек ([usedBookKeys] — нээсэн, нуусан ч).
///
/// Амжилттай бол серверийн шинэ `ClassCheck` (түүхий JSON), болих бол `null`.
Future<Json?> showNewBookCheckSheet(
  BuildContext context, {
  required String classroomId,
  Set<String> usedBookKeys = const {},
}) => showModalBottomSheet<Json>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (_) => NewBookCheckSheet(classroomId: classroomId, usedBookKeys: usedBookKeys),
);

class NewBookCheckSheet extends ConsumerStatefulWidget {
  const NewBookCheckSheet({super.key, required this.classroomId, this.usedBookKeys = const {}});

  final String classroomId;
  final Set<String> usedBookKeys;

  @override
  ConsumerState<NewBookCheckSheet> createState() => _NewBookCheckSheetState();
}

class _NewBookCheckSheetState extends ConsumerState<NewBookCheckSheet> {
  final _price = TextEditingController();
  String? _kind;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _price.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final kind = _kind;
    if (kind == null) return;
    final digits = _price.text.replaceAll(RegExp(r'\D'), '');
    final n = digits.isEmpty ? 0 : int.parse(digits);
    if (n <= 0) return setState(() => _error = 'Үнээ оруулна уу');
    if (n > kCheckAmountMax) return setState(() => _error = 'Дүн ${formatMnt(kCheckAmountMax)}-өөс их байж болохгүй');
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final created = await ref
          .read(bookMoneyRepositoryProvider)
          .createBookCheck(widget.classroomId, bookKey: kind, amount: n);
      if (mounted) Navigator.of(context).pop(created);
    } catch (e) {
      if (mounted) setState(() => _error = bookError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    final kinds = [...kBooks, ...kSheetKinds];
    return Padding(
      padding: EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.lg + bottom),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Ямар чек нээх вэ', style: context.text.titleLarge),
            const SizedBox(height: AppSpace.md),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final k in kinds)
                  ChoiceChip(
                    key: Key('book-kind-${k.key}'),
                    label: Text(k.title),
                    selected: _kind == k.key,
                    showCheckmark: false,
                    materialTapTargetSize: MaterialTapTargetSize.padded,
                    tooltip: widget.usedBookKeys.contains(k.key) ? 'Энэ номын чек энэ ангид нээгдсэн' : null,
                    onSelected: _busy || widget.usedBookKeys.contains(k.key)
                        ? null
                        : (_) => setState(() {
                            _kind = k.key;
                            _error = null;
                          }),
                  ),
              ],
            ),
            if (_kind != null) ...[
              const SizedBox(height: AppSpace.lg),
              TextField(
                key: const Key('book-check-price'),
                controller: _price,
                autofocus: true,
                enabled: !_busy,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(9),
                  const ThousandsFormatter(),
                ],
                decoration: InputDecoration(labelText: 'Үнэ', hintText: priceHint(_kind!), suffixText: '₮'),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: AppSpace.md),
              Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
            ],
            const SizedBox(height: AppSpace.lg),
            FilledButton(
              key: const Key('book-check-open'),
              onPressed: _busy || _kind == null ? null : _submit,
              child: const Text('Нээх'),
            ),
          ],
        ),
      ),
    );
  }
}
