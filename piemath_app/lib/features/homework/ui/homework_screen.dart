import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import 'classroom_homework_view.dart';
import 'homework_icons.dart';
import 'homework_providers.dart';
import 'online_homework_view.dart';

/// `/app/homework` — ангийн төрлөөр хоёр загвар (STATUS §7.11): танхим → өдөр бүрийн дэвтрийн зураг,
/// онлайн → багшийн даалгавар.
class HomeworkScreen extends ConsumerWidget {
  const HomeworkScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(isOnlineStudentProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Гэрийн даалгавар'),
        actions: [
          if (!online)
            IconButton(
              tooltip: 'Жилийн түүх',
              icon: const Icon(HomeworkIcons.history),
              onPressed: () => context.push('/app/homework/history'),
            ),
          InfoHint(
            title: 'Гэрийн даалгавар',
            message: online
                ? 'Багшийн өгсөн даалгаврын зургийг илгээнэ. Багш шалгаад батлах эсвэл буцаана. Зураг 7 хоног хадгалагдана.'
                : 'Хичээлийн өдөр бүрийн дэвтрийнхээ зургийг илгээнэ. Ангид хийсэн тестийн нөгөө хувилбарыг энд бодно. Зураг 7 хоног хадгалагдана.',
          ),
        ],
      ),
      body: online ? const OnlineHomeworkView() : const ClassroomHomeworkView(),
    );
  }
}
