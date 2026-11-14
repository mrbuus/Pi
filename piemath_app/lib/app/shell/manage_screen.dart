import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/ui/ui.dart';
import '../nav/nav_data.dart';

/// Админы «Удирдлага» төв (`/app/admin`) — багшийн самбарын дээд талын товчоор нээгдэнэ.
/// Апп-д хийгдээгүй хуудас «удахгүй» гэж харагдана (PendingScreen).
class ManageScreen extends StatelessWidget {
  const ManageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Удирдлага')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
        children: [
          for (final (title, links) in NavData.manageGroups) ...[
            SectionHeader(title: title),
            AppCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (var i = 0; i < links.length; i++) ...[
                    if (i > 0) Divider(indent: 56, color: context.colors.line),
                    ListTile(
                      leading: Icon(links[i].icon),
                      title: Text(links[i].label),
                      trailing: Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
                      onTap: () => context.push(links[i].path),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
