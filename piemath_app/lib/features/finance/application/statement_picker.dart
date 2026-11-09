import 'dart:typed_data';

import 'package:file_selector/file_selector.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Төхөөрөмжөөс сонгосон банкны хуулга.
typedef PickedStatement = ({String name, Uint8List bytes});

/// Банкны хуулга (.xlsx / .csv) сонгох. Хэрэглэгч болих бол `null`.
abstract interface class StatementPicker {
  Future<PickedStatement?> pick();
}

/// Утасны файл сонгогч (`file_selector`): Android — MIME, iOS — UTI.
class FileSelectorStatementPicker implements StatementPicker {
  const FileSelectorStatementPicker();

  static const _group = XTypeGroup(
    label: 'Хуулга',
    extensions: ['xlsx', 'csv'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
    uniformTypeIdentifiers: ['org.openxmlformats.spreadsheetml.sheet', 'public.comma-separated-values-text'],
  );

  @override
  Future<PickedStatement?> pick() async {
    final file = await openFile(acceptedTypeGroups: const [_group]);
    if (file == null) return null;
    return (name: file.name, bytes: await file.readAsBytes());
  }
}

/// Файл сонгогч. `null` бол (сонгогчгүй төхөөрөмж, тест) дэлгэц оруулах боломжгүйг тайлбарлана.
final statementPickerProvider = Provider<StatementPicker?>((ref) => const FileSelectorStatementPicker());
