import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Төхөөрөмжөөс сонгосон банкны хуулга.
typedef PickedStatement = ({String name, Uint8List bytes});

/// Банкны хуулга (.xlsx / .csv) сонгох. Хэрэглэгч болих бол `null`.
abstract interface class StatementPicker {
  Future<PickedStatement?> pick();
}

/// Файл сонгогч. Апп-д файл сонгох сан (`file_picker`) хараахан багцлагдаагүй тул өгөгдмөл нь `null` —
/// тэр үед дэлгэц «Хуулгыг вэбээр оруулна» гэж тайлбарлана. Сан нэмэгдмэгц bootstrap-д override хийнэ.
final statementPickerProvider = Provider<StatementPicker?>((ref) => null);
