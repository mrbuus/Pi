import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/photo_source.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../exam/ui/widgets/exam_timer.dart';
import '../data/placement_repository.dart';

enum PlacementPhase { loading, intro, test, done, error }

/// Түвшин тогтоох шалгалт (`/placement`, нэвтрэлтгүй) — вэбийн `PlacementClient`-тэй ижил урсгал, апп дотор:
///
/// 1) Заавар + маягт (нэр, утас, анги, сургууль, эцэг эхийн утас) → `POST /placement/start`
/// 2) Цагтай тест: хариу (A–E эсвэл нүд), бодлого бүрт бодолтын зураг (камер / зургийн сан), хариу
///    автоматаар хадгалагдана, хугацаа дуусахад өөрөө илгээнэ. Апп хаагдвал зочны түлхүүрээр үргэлжилнэ.
/// 3) Илгээсний дараа багш бодолтыг үзээд утсаар холбогдоно.
/// Таймер, хариуны сонголт нь шалгалтын хөдөлгүүрийн widget ([ExamTimer], [ChoiceGrid]).
class PlacementScreen extends ConsumerStatefulWidget {
  const PlacementScreen({super.key});

  @override
  ConsumerState<PlacementScreen> createState() => _PlacementScreenState();
}

class _PlacementScreenState extends ConsumerState<PlacementScreen> {
  PlacementPhase _phase = PlacementPhase.loading;
  PlacementTest? _test;
  PlacementAttempt? _attempt;
  PlacementAnswers _answers = {};
  PlacementPhotos _photos = {};
  final _previews = <String, Uint8List>{};
  final _uploading = <int>{};
  final _remaining = ValueNotifier<int?>(null);
  Timer? _ticker;
  Timer? _saveTimer;
  bool _dirty = false;
  bool _sending = false;
  bool _autoDone = false;

  PlacementRepository get _repo => ref.read(placementRepositoryProvider);
  PlacementAttemptStore get _store => ref.read(placementAttemptStoreProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    _saveTimer?.cancel();
    // Хадгалагдаагүй хариуг гарахдаа нэг удаа илгээнэ (алдаа гарвал дараа нь resume-ээс сэргэнэ).
    final a = _attempt;
    if (_dirty && a != null && _phase == PlacementPhase.test) unawaited(_repo.save(a, _answers).catchError((_) {}));
    _remaining.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _phase = PlacementPhase.loading);
    try {
      final saved = await _store.read();
      if (saved != null) {
        try {
          final r = await _repo.resume(saved);
          if (!mounted) return;
          if (r.submitted) {
            await _store.write(null);
            setState(() {
              _test = r.test;
              _phase = PlacementPhase.done;
            });
            return;
          }
          final server = r.deadlineAt;
          final deadline = server != null && server.isBefore(saved.deadline) ? server : saved.deadline;
          _startTest(saved.withDeadline(deadline), r.test, answers: r.answers, photos: r.photos);
          return;
        } on ApiError catch (e) {
          if (const [403, 404, 410].contains(e.status)) {
            await _store.write(null);
          } else {
            rethrow;
          }
        }
      }
      final t = await _repo.test();
      if (!mounted) return;
      setState(() {
        _test = t;
        _phase = PlacementPhase.intro;
      });
    } catch (_) {
      if (mounted) setState(() => _phase = PlacementPhase.error);
    }
  }

  void _startTest(PlacementAttempt a, PlacementTest t, {PlacementAnswers? answers, PlacementPhotos? photos}) {
    setState(() {
      _attempt = a;
      _test = t;
      _answers = {...?answers};
      _photos = {...?photos};
      _phase = PlacementPhase.test;
    });
    _tick();
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    final a = _attempt;
    if (a == null) return;
    final left = a.deadline.difference(DateTime.now().toUtc()).inMilliseconds;
    _remaining.value = math.max(0, (left / 1000).ceil());
    if (left <= 0) unawaited(_submit(auto: true));
  }

  Future<void> _onStarted(PlacementAttempt a, PlacementTest t) async {
    await _store.write(a);
    if (mounted) _startTest(a, t);
  }

  void _setAnswer(int n, Object value) {
    setState(() => _answers = {..._answers, '$n': value});
    _dirty = true;
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 700), _save);
  }

  Future<void> _save() async {
    final a = _attempt;
    if (a == null || !_dirty || _phase != PlacementPhase.test) return;
    _dirty = false;
    try {
      await _repo.save(a, _answers);
    } catch (_) {
      _dirty = true;
    }
  }

  Future<void> _addPhoto(PlacementProblem p) async {
    final a = _attempt;
    final left = placementMaxPhotos - (_photos['${p.n}']?.length ?? 0);
    if (a == null || left <= 0) return;
    final source = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(AppIcons.camera),
              title: const Text('Камераар зураг авах'),
              onTap: () => Navigator.pop(ctx, 'camera'),
            ),
            ListTile(
              leading: const Icon(AppIcons.gallery),
              title: const Text('Зургийн сангаас сонгох'),
              onTap: () => Navigator.pop(ctx, 'gallery'),
            ),
          ],
        ),
      ),
    );
    if (source == null || !mounted) return;
    final picker = ref.read(photoSourceProvider);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _uploading.add(p.n));
    try {
      final pages = source == 'camera'
          ? [?await picker.takePhoto()]
          : await picker.pickFromGallery(limit: left);
      for (final page in pages.take(left)) {
        final (key, photos) = await _repo.addPhoto(a, p.n, page.bytes);
        if (!mounted) return;
        setState(() {
          _photos = photos;
          _previews[key] = page.bytes;
        });
      }
    } on ApiError catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Зургийг авч чадсангүй. Дахин оролдоно уу')));
    } finally {
      if (mounted) setState(() => _uploading.remove(p.n));
    }
  }

  Future<void> _removePhoto(String key) async {
    final a = _attempt;
    if (a == null) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final photos = await _repo.removePhoto(a, key);
      if (mounted) setState(() => _photos = photos);
    } on ApiError catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Future<void> _confirmSubmit() async {
    final t = _test;
    if (t == null || _sending) return;
    final missing = [for (final p in t.problems) if ((_photos['${p.n}'] ?? const []).isEmpty) p.n];
    final unanswered = t.problems.where((p) => !placementAnswered(p, _answers)).length;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Шалгалтаа илгээх үү'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              missing.isEmpty
                  ? 'Бүх бодлогод бодолтын зураг орсон байна'
                  : '${missing.join(', ')}-р бодлогод бодолтын зураг алга, эдгээрийг чадаагүй гэж үзнэ',
            ),
            if (unanswered > 0) ...[const SizedBox(height: AppSpace.sm), Text('$unanswered бодлогод хариу сонгоогүй байна')],
            const SizedBox(height: AppSpace.sm),
            const Text('Илгээсний дараа засах боломжгүй'),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Үргэлжлүүлэн бодох')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Илгээх')),
        ],
      ),
    );
    if (ok ?? false) await _submit(auto: false);
  }

  Future<void> _submit({required bool auto}) async {
    final a = _attempt;
    if (a == null || _sending || _phase != PlacementPhase.test) return;
    setState(() => _sending = true);
    _saveTimer?.cancel();
    try {
      await _repo.submit(a, _answers, auto: auto);
      await _finish(auto: auto);
    } on ApiError catch (e) {
      if (e.status == 410) {
        await _finish(auto: true);
      } else if (mounted) {
        if (!auto) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
        // Автомат илгээлт бүтэлгүйтвэл дараагийн секундэд дахин оролдоно.
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _finish({required bool auto}) async {
    _ticker?.cancel();
    _dirty = false;
    await _store.write(null);
    if (!mounted) return;
    setState(() {
      _autoDone = auto;
      _phase = PlacementPhase.done;
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = _test;
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Түвшин тогтоох шалгалт'),
        actions: [
          if (_phase == PlacementPhase.test)
            Padding(
              padding: const EdgeInsets.only(right: AppSpace.sm),
              child: Center(child: ExamTimer(remaining: _remaining)),
            ),
        ],
      ),
      body: switch (_phase) {
        PlacementPhase.loading => const LoadingState(cards: 2),
        PlacementPhase.error => ErrorState(
            message: 'Шалгалтыг ачаалж чадсангүй, интернэтээ шалгаад дахин оролдоно уу',
            onRetry: _load,
          ),
        PlacementPhase.intro => _PlacementIntro(test: t!, onStarted: _onStarted),
        PlacementPhase.done => _done(context),
        PlacementPhase.test => _testView(context, t!),
      },
    );
  }

  Widget _done(BuildContext context) => EmptyState(
        icon: AppIcons.success,
        title: 'Шалгалт илгээгдлээ',
        message: '${_autoDone ? 'Хугацаа дууссан тул шалгалт автоматаар илгээгдсэн' : 'Баярлалаа, хичээнгүйлэн бодсонд'}. '
            'Багш бодолтыг чинь үзээд түвшинг тогтоож, бүртгүүлсэн утсаар чинь холбогдоно',
        action: OutlinedButton(
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
          child: const Text('Буцах'),
        ),
      );

  Widget _testView(BuildContext context, PlacementTest t) {
    final answered = t.problems.where((p) => placementAnswered(p, _answers)).length;
    final withPhoto = t.problems.where((p) => (_photos['${p.n}'] ?? const []).isNotEmpty).length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        Meta(items: ['Хариу $answered/${t.problems.length}', 'Зураг $withPhoto/${t.problems.length}']),
        const SizedBox(height: AppSpace.md),
        AppCard(
          accent: context.colors.warning,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(AppIcons.warning, size: 18, color: context.colors.warning),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  'Бодлого бүрийн бодолтыг цаасан дээр бодоод зургийг нь тухайн бодлогын доор оруул. Бодолтын '
                  'зураггүй бодлогыг чадаагүй гэж үзнэ',
                  style: context.text.bodyMedium,
                ),
              ),
            ],
          ),
        ),
        for (final p in t.problems) ...[
          const SizedBox(height: AppSpace.md),
          _ProblemCard(
            problem: p,
            answer: _answers['${p.n}'],
            onAnswer: (v) => _setAnswer(p.n, v),
            photos: _photos['${p.n}'] ?? const [],
            previews: _previews,
            uploading: _uploading.contains(p.n),
            onAddPhoto: () => _addPhoto(p),
            onRemovePhoto: _removePhoto,
          ),
        ],
        const SizedBox(height: AppSpace.xl),
        FilledButton.icon(
          onPressed: _sending ? null : _confirmSubmit,
          icon: _sending ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(AppIcons.send, size: 18),
          label: const Text('Шалгалтаа илгээх'),
        ),
      ],
    );
  }
}

const _how = [
  (AppIcons.penLine, 'Цаасан дээр бод', 'Бодлого бүрийн бодолтыг дэвтэр эсвэл цаасан дээр бүтэн бич'),
  (AppIcons.camera, 'Зургийг нь ав', 'Утасныхаа камераар бодолтоо тод, бүтнээр нь зураг ав'),
  (AppIcons.imagePlus, 'Бодлогын доор оруул', 'Тухайн бодлогын доорх «Бодолтын зураг» товчийг дарж зургаа сонго'),
];

class _PlacementIntro extends ConsumerStatefulWidget {
  const _PlacementIntro({required this.test, required this.onStarted});

  final PlacementTest test;
  final Future<void> Function(PlacementAttempt, PlacementTest) onStarted;

  @override
  ConsumerState<_PlacementIntro> createState() => _PlacementIntroState();
}

class _PlacementIntroState extends ConsumerState<_PlacementIntro> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _school = TextEditingController();
  final _parent = TextEditingController();
  int? _grade;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _school.dispose();
    _parent.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (_busy) return;
    final err = validatePlacementStart(name: _name.text, phone: _phone.text, grade: _grade, parentPhone: _parent.text);
    setState(() => _error = err);
    if (err != null) return;
    setState(() => _busy = true);
    try {
      final (a, t) = await ref.read(placementRepositoryProvider).start(
            PlacementStartForm(
              name: _name.text,
              phone: _phone.text,
              grade: _grade!,
              school: _school.text,
              parentPhone: _parent.text,
            ),
          );
      await widget.onStarted(a, t);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.test;
    final digits = [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(8)];
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        Text(t.title, style: context.text.titleLarge),
        const SizedBox(height: AppSpace.xs),
        Meta(items: ['${t.problems.length} бодлого', if (t.minutes > 0) '${t.minutes} минут']),
        const SizedBox(height: AppSpace.sm),
        Text(
          'Цагтай тест бодоод бодолтын зургаа илгээ, багш түвшинг чинь тогтоож холбогдоно',
          style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
        ),
        const SectionHeader(title: 'Бодолтоо хэрхэн илгээх вэ'),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final (i, (icon, title, desc)) in _how.indexed) ...[
                if (i > 0) const SizedBox(height: AppSpace.md),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, size: 20, color: context.colors.brand),
                    const SizedBox(width: AppSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${i + 1}. $title', style: context.text.titleSmall),
                          Text(desc, style: context.text.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
              if (t.instructions.isNotEmpty) ...[
                const Divider(height: AppSpace.xl),
                for (final line in t.instructions) ...[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        line.contains('чадаагүй') ? AppIcons.warning : AppIcons.success,
                        size: 16,
                        color: line.contains('чадаагүй') ? context.colors.warning : context.colors.success,
                      ),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(child: MathText(line, style: context.text.bodyMedium)),
                    ],
                  ),
                  const SizedBox(height: AppSpace.xs),
                ],
              ],
            ],
          ),
        ),
        const SectionHeader(title: 'Мэдээллээ бөглө'),
        TextField(
          controller: _name,
          enabled: !_busy,
          maxLength: 100,
          autofillHints: const [AutofillHints.name],
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(labelText: 'Овог нэр', hintText: 'Б. Тэмүүжин', counterText: ''),
        ),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: _phone,
          enabled: !_busy,
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumber],
          inputFormatters: digits,
          decoration: const InputDecoration(labelText: 'Утасны дугаар', hintText: '99112233'),
        ),
        const SizedBox(height: AppSpace.md),
        DropdownButtonFormField<int>(
          initialValue: _grade,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Анги'),
          items: [for (final g in const [12, 11, 10, 9, 8, 7, 6]) DropdownMenuItem(value: g, child: Text('$g-р анги'))],
          onChanged: _busy ? null : (g) => setState(() => _grade = g),
        ),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: _school,
          enabled: !_busy,
          maxLength: 120,
          decoration: const InputDecoration(labelText: 'Сургууль', helperText: 'Заавал биш', counterText: ''),
        ),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: _parent,
          enabled: !_busy,
          keyboardType: TextInputType.phone,
          inputFormatters: digits,
          decoration: const InputDecoration(labelText: 'Эцэг эхийн утас', helperText: 'Заавал биш'),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpace.md),
          Semantics(
            liveRegion: true,
            child: Text(_error!, style: context.text.bodyMedium?.copyWith(color: context.colors.error)),
          ),
        ],
        const SizedBox(height: AppSpace.lg),
        FilledButton.icon(
          onPressed: _busy ? null : _start,
          icon: _busy ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(AppIcons.time, size: 18),
          label: Text(t.minutes > 0 ? 'Шалгалт эхлэх, ${t.minutes} минут' : 'Шалгалт эхлэх'),
        ),
        const SizedBox(height: AppSpace.sm),
        Text(
          'Эхэлмэгц цаг явж эхэлнэ. Апп санамсаргүй хаагдвал энэ хуудсыг дахин нээгээд үргэлжлүүлнэ',
          style: context.text.bodySmall,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _ProblemCard extends StatelessWidget {
  const _ProblemCard({
    required this.problem,
    required this.answer,
    required this.onAnswer,
    required this.photos,
    required this.previews,
    required this.uploading,
    required this.onAddPhoto,
    required this.onRemovePhoto,
  });

  final PlacementProblem problem;
  final Object? answer;
  final ValueChanged<Object> onAnswer;
  final List<String> photos;
  final Map<String, Uint8List> previews;
  final bool uploading;
  final VoidCallback onAddPhoto;
  final ValueChanged<String> onRemovePhoto;

  @override
  Widget build(BuildContext context) {
    final p = problem;
    final c = context.colors;
    final keys = p.choices.keys.toList();
    final selected = answer is String ? keys.indexOf(answer! as String) : -1;
    final boxes = answer is Map ? (answer! as Map).cast<String, String>() : const <String, String>{};
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(header: true, child: Text('${p.n}-р бодлого', style: context.text.titleMedium)),
          const SizedBox(height: AppSpace.sm),
          MathText(p.statement, style: context.text.bodyLarge),
          const SizedBox(height: AppSpace.lg),
          if (p.isChoice)
            ChoiceGrid(
              groupLabel: '${p.n}-р бодлогын хариултын сонголтууд',
              choices: [for (final k in keys) ChoiceItem(label: k, text: p.choices[k]!)],
              selectedIndex: selected < 0 ? null : selected,
              onSelect: (i) => onAnswer(keys[i]),
            )
          else
            Wrap(
              spacing: AppSpace.md,
              runSpacing: AppSpace.sm,
              children: [
                for (final b in p.boxes)
                  SizedBox(
                    width: 64.0 + b.digits * 14,
                    child: TextFormField(
                      initialValue: boxes[b.key] ?? '',
                      keyboardType: const TextInputType.numberWithOptions(signed: true),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp('[0-9-]')),
                        LengthLimitingTextInputFormatter(b.digits + 1),
                      ],
                      textAlign: TextAlign.center,
                      decoration: InputDecoration(labelText: '[${b.key}]'),
                      onChanged: (v) => onAnswer({...boxes, b.key: v}),
                    ),
                  ),
              ],
            ),
          const SizedBox(height: AppSpace.lg),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: uploading || photos.length >= placementMaxPhotos ? null : onAddPhoto,
                icon: uploading
                    ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(AppIcons.camera, size: 18),
                label: const Text('Бодолтын зураг'),
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  photos.isEmpty ? 'Зураг оруулаагүй бол чадаагүй гэж үзнэ' : '${photos.length} зураг орсон',
                  style: context.text.bodySmall?.copyWith(color: photos.isEmpty ? c.warning : c.success),
                ),
              ),
            ],
          ),
          if (photos.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final (i, k) in photos.indexed)
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        child: Container(
                          width: 80,
                          height: 80,
                          color: c.surfaceSunken,
                          alignment: Alignment.center,
                          child: previews[k] != null
                              ? Image.memory(
                                  previews[k]!,
                                  width: 80,
                                  height: 80,
                                  fit: BoxFit.cover,
                                  semanticLabel: '${p.n}-р бодлогын бодолт ${i + 1}',
                                )
                              : Text('Зураг ${i + 1}', style: context.text.bodySmall),
                        ),
                      ),
                      Positioned(
                        right: -12,
                        top: -12,
                        child: IconButton(
                          tooltip: '${i + 1}-р зургийг устгах',
                          icon: const Icon(AppIcons.close, size: 16),
                          style: IconButton.styleFrom(backgroundColor: c.surface),
                          onPressed: () => onRemovePhoto(k),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
