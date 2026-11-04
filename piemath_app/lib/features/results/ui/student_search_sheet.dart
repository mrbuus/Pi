import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../teacher/application/teacher_providers.dart' show errorText;
import '../application/results_providers.dart';
import '../data/results_models.dart';

/// Сурагч хайх (вэбийн `StudentPicker`, `GET /users/search?q=`): код эсвэл нэрээр, 2+ тэмдэгт.
Future<StudentHit?> showStudentSearchSheet(BuildContext context) => showModalBottomSheet<StudentHit>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (_) => const StudentSearchSheet(),
);

class StudentSearchSheet extends ConsumerStatefulWidget {
  const StudentSearchSheet({super.key});

  @override
  ConsumerState<StudentSearchSheet> createState() => _StudentSearchSheetState();
}

class _StudentSearchSheetState extends ConsumerState<StudentSearchSheet> {
  final _query = TextEditingController();
  Timer? _debounce;
  List<StudentHit> _hits = const [];
  bool _loading = false;
  String? _error;
  int _seq = 0;

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _changed(String text) {
    _debounce?.cancel();
    final q = text.trim();
    if (q.length < 2) {
      setState(() {
        _hits = const [];
        _loading = false;
        _error = null;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(q));
  }

  Future<void> _search(String q) async {
    final seq = ++_seq;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final hits = await ref.read(resultsRepositoryProvider).searchStudents(q);
      if (!mounted || seq != _seq) return;
      setState(() {
        _hits = hits;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || seq != _seq) return;
      setState(() {
        _loading = false;
        _error = errorText(e, 'Хайлт амжилтгүй боллоо');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final empty = _query.text.trim().length >= 2 && !_loading && _error == null && _hits.isEmpty;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.75,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              child: Text('Сурагч хайх', style: context.text.titleMedium),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpace.gutter),
              child: TextField(
                key: const ValueKey('student-search'),
                controller: _query,
                autofocus: true,
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(prefixIcon: Icon(AppIcons.search), hintText: 'Код эсвэл нэр'),
                onChanged: _changed,
                onSubmitted: (t) {
                  if (t.trim().length >= 2) _search(t.trim());
                },
              ),
            ),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.all(AppSpace.gutter),
                child: Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
              ),
            if (empty)
              Padding(
                padding: const EdgeInsets.all(AppSpace.gutter),
                child: Text('Сурагч олдсонгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
              ),
            Expanded(
              child: ListView.builder(
                itemCount: _hits.length,
                itemBuilder: (context, i) {
                  final h = _hits[i];
                  return ListTile(
                    minTileHeight: 56,
                    leading: const Icon(AppIcons.user),
                    title: Text(h.name),
                    subtitle: h.studentCode == null ? null : Text(h.studentCode!),
                    onTap: () => Navigator.of(context).pop(h),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
