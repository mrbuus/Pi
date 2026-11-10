import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Мөнгө өөрчлөх үйлдлийн давхар илгээлтээс хамгаалалт.
///
/// Ижил [key]-тэй үйлдэл дуусаагүй байхад дахин дуудвал серверт ОГТ илгээхгүй, `null` буцаана.
/// Товчийг идэвхгүй болгохоос гадна (хоёр хуруугаар зэрэг дарах, маягт ба жагсаалтаас зэрэг) хамгаална.
class SubmitGuard {
  final _running = <String>{};

  bool isRunning(String key) => _running.contains(key);

  /// [action]-ыг нэг л удаа ажиллуулна. Аль хэдийн ажиллаж байвал `null` (алдаа шиддэггүй).
  Future<T?> run<T>(String key, Future<T> Function() action) async {
    if (!_running.add(key)) return null;
    try {
      return await action();
    } finally {
      _running.remove(key);
    }
  }
}

/// Апп даяар нэг хамгаалалт — дэлгэц дахин зурагдсан ч хадгалагдана.
final financeSubmitGuardProvider = Provider<SubmitGuard>((ref) => SubmitGuard());
