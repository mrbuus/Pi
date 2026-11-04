import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../core/network/api_error.dart';
import '../data/authoring_models.dart';
import '../data/authoring_repository.dart';
import '../data/authoring_storage.dart';
import '../domain/builder_logic.dart';

/// Тест үүсгэх маягтын серверийн автомат ноорог — вэбийн `app/app/tests/new/page.tsx`-ийн логик:
///
/// - Маягт өөрчлөгдсөнөөс 2 секундын дараа (хоосон бол үгүй) дараалсан нэг хадгалалт.
/// - Анх `POST /tests/drafts`, дараа нь `PATCH` + `expectedRevision`. Заагчийг утсанд хадгална.
/// - 409 — өөр төхөөрөмж шинэчилсэн: автомат хадгалалт зогсоод сүүлийн хувилбарыг татаж,
///   «Хадгалсан хувилбарыг нээх» эсвэл «Миний хувилбарыг шинэ ноорог болгох» сонголт өгнө.
/// - Нээхэд өмнөх ноорог байвал «Үргэлжлүүлэх» / «Шинээр эхлэх».
///
/// Ялгаа: вэб «Шинээр эхлэх», тест үүссэний дараа серверийн ноорогийг `DELETE` хийдэг — тэр нь
/// жинхэнэ устгал тул апп зөвхөн заагчаа мартана (ноорог серверт үлдэнэ).
class DraftAutosaver extends ChangeNotifier {
  DraftAutosaver({
    required TestAuthoringRepository repository,
    required DraftPointerStore store,
    required this.ownerId,
    this.delay = const Duration(seconds: 2),
  }) : _repo = repository,
       _pointers = store;

  final TestAuthoringRepository _repo;
  final DraftPointerStore _pointers;

  /// Нооргийн эзэн (нэвтэрсэн хэрэглэгч).
  final String ownerId;
  final Duration delay;

  String? _draftId;
  int _revision = 0;
  bool _ready = false;
  bool _active = false;
  bool _blocked = false;
  TestDraftSnapshot? _candidate;
  TestDraftSnapshot? _conflict;
  String _status = '';
  String _error = '';
  String _restoreError = '';
  Timer? _timer;
  BuilderForm? _last;
  Future<void> _queue = Future<void>.value();
  bool _disposed = false;

  String? get draftId => _draftId;
  int get revision => _revision;

  /// Эзэн, өмнөх ноорог шалгагдсан.
  bool get ready => _ready;

  /// Автомат хадгалалт ажиллаж байгаа.
  bool get active => _active;

  /// Нээхэд олдсон өмнөх ноорог («Үргэлжлүүлэх» / «Шинээр эхлэх» хүлээж байна).
  TestDraftSnapshot? get candidate => _candidate;

  /// 409-ийн дараах серверийн сүүлийн хувилбар.
  TestDraftSnapshot? get conflict => _conflict;

  String get status => _status;
  String get error => _error;
  String get restoreError => _restoreError;

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  /// Өмнөх ноорог байгаа эсэхийг шалгана.
  Future<void> restore() async {
    _restoreError = '';
    _notify();
    final stored = _pointers.read(ownerId);
    if (stored == null || stored.isEmpty) {
      _ready = true;
      _active = true;
      _notify();
      return;
    }
    try {
      _candidate = await _repo.draft(stored);
      _ready = true;
    } on ApiError catch (e) {
      if (e.kind != ApiErrorKind.notFound) {
        _restoreError = 'Нооргийг ачаалж чадсангүй. Дахин оролдоно уу';
        _notify();
        return;
      }
      await _pointers.clear(ownerId);
      _status = 'Өмнөх ноорог олдсонгүй, шинээр эхэлж болно';
      _ready = true;
      _active = true;
    } on Object {
      _restoreError = 'Нооргийг ачаалж чадсангүй. Дахин оролдоно уу';
    }
    _notify();
  }

  /// Маягт өөрчлөгдөв — [delay]-ийн дараа хадгална (дахин өөрчлөгдвөл хугацаа шинээр).
  void schedule(BuilderForm form) {
    _timer?.cancel();
    if (!_ready || !_active || _conflict != null || !form.hasContent) return;
    _last = form;
    _timer = Timer(delay, () => unawaited(_enqueue(form)));
  }

  /// «Хадгалалтыг дахин оролдох».
  Future<void> retry() async {
    final f = _last;
    if (f == null || !_active || _conflict != null) return;
    _timer?.cancel();
    await _enqueue(f);
  }

  Future<void> _enqueue(BuilderForm form) {
    _status = 'Хадгалж байна';
    _error = '';
    _notify();
    return _queue = _queue.then((_) => _save(form));
  }

  Future<void> _save(BuilderForm form) async {
    if (_blocked) return;
    final activeId = _draftId;
    try {
      if (activeId == null) {
        final created = await _repo.createDraft(form.toDraftJson());
        _draftId = created.id;
        _revision = created.revision;
        await _pointers.write(ownerId, created.id);
      } else {
        final saved = await _repo.updateDraft(activeId, form.toDraftJson(), expectedRevision: _revision);
        _revision = saved.revision;
      }
      _status = 'Серверт хадгаллаа';
    } on ApiError catch (e) {
      if (e.kind == ApiErrorKind.conflict && activeId != null) {
        _blocked = true;
        try {
          _conflict = await _repo.draft(activeId);
          _status = 'Ноорог өөр төхөөрөмжөөс шинэчлэгдсэн';
        } on ApiError catch (reload) {
          _error = reload.message;
        }
      } else {
        _error = e.message;
        _status = 'Хадгалалт амжилтгүй';
      }
    } on Object {
      _error = 'Ноорог хадгалж чадсангүй';
      _status = 'Хадгалалт амжилтгүй';
    }
    _notify();
  }

  /// Өмнөх нооргийг үргэлжлүүлнэ — маягтад тавих төлөвийг буцаана.
  BuilderForm? continueCandidate() {
    final c = _candidate;
    if (c == null) return null;
    _draftId = c.id;
    _revision = c.revision;
    _candidate = null;
    _active = true;
    _status = 'Өмнөх серверийн нооргийг үргэлжлүүлж байна';
    _notify();
    return BuilderForm.fromDraftState(c.state);
  }

  /// Өмнөх ноорогоос татгалзаж шинээр эхэлнэ (серверийн ноорог устгагдахгүй, заагч л мартагдана).
  Future<void> startFresh() async {
    if (_candidate != null) await _pointers.clear(ownerId);
    _candidate = null;
    _resetIds();
    _conflict = null;
    _blocked = false;
    _active = true;
    _status = 'Шинэ ноорог эхэллээ';
    _notify();
  }

  /// 409: серверийн сүүлийн хувилбарыг нээнэ — маягтад тавих төлөвийг буцаана.
  BuilderForm? loadLatest() {
    final latest = _conflict;
    if (latest == null) return null;
    _conflict = null;
    _blocked = false;
    _revision = latest.revision;
    _status = 'Серверийн хамгийн сүүлийн хувилбарыг нээлээ';
    _notify();
    return BuilderForm.fromDraftState(latest.state);
  }

  /// 409: энэ төхөөрөмжийн хувилбарыг тусдаа шинэ ноорог болгоно (нөгөө ноорог хэвээр).
  Future<void> saveLocalAsNew(BuilderForm form) async {
    if (_conflict == null) return;
    _error = '';
    _notify();
    try {
      final created = await _repo.createDraft(form.toDraftJson());
      _draftId = created.id;
      _revision = created.revision;
      await _pointers.write(ownerId, created.id);
      _conflict = null;
      _blocked = false;
      _status = 'Өөрийн хувилбарыг шинэ серверийн ноорог болгож хадгаллаа';
    } on ApiError catch (e) {
      _error = e.message;
    }
    _notify();
  }

  /// Тест үүсгэхийн өмнө: автомат хадгалалтыг зогсоож, явж буй хадгалалтыг хүлээнэ.
  Future<void> beginPublish() async {
    _timer?.cancel();
    _active = false;
    _blocked = true;
    _notify();
    await _queue;
  }

  /// Тест үүслээ — заагчийг мартана.
  Future<void> publishSucceeded() async {
    await _pointers.clear(ownerId);
    _resetIds();
    _notify();
  }

  /// Үүсгэж чадсангүй — автомат хадгалалт үргэлжилнэ.
  void publishFailed() {
    _blocked = false;
    _active = true;
    _notify();
  }

  /// «Шинэ тест үүсгэх» (амжилтын дараа) — шинэ ноорог.
  void reset() {
    _timer?.cancel();
    _resetIds();
    _candidate = null;
    _conflict = null;
    _blocked = false;
    _active = true;
    _status = '';
    _error = '';
    _notify();
  }

  void _resetIds() {
    _draftId = null;
    _revision = 0;
  }

  /// Тестэд: хүлээгдэж буй хадгалалт дуусах хүртэл.
  @visibleForTesting
  Future<void> get idle => _queue;

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}
