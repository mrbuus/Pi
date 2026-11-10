import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/ui/ui.dart';
import '../../payments/domain/org_info.dart';

/// Салбарууд — вэбийн `web/src/lib/orgInfo.ts` `BRANCHES` (төвийн нийтэлсэн мэдээлэл). Өөрчлөгдвөл ХОЁУЛАНГ.
const centreBranches = [
  (
    label: 'Салбар 1',
    address: 'Баруун 4 зам, Барилгын политехник коллежийн хойно, «Бунда-Рага» улаан тоосгон байшин, 5 давхар',
  ),
  (
    label: 'Салбар 2',
    address: 'Зүүн 4 зам, Жуковын автобусны буудлын баруун талд, «Жоби 72» төвийн 3 давхар',
  ),
];

/// Төвийн мэдээлэл (`/app/support/centre`) — вэбийн нүүр хуудасны «Төвийн танилцуулга», «Салбар»,
/// «Холбоо барих» хэсгийн апп доторх хувилбар (туслахын хариуны эх сурвалж энд нээгдэнэ).
class CentreInfoScreen extends StatelessWidget {
  const CentreInfoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final dim = context.text.bodyMedium?.copyWith(color: context.colors.inkDim);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Төвийн мэдээлэл')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          Text(OrgInfo.centerName, style: context.text.titleMedium),
          const SizedBox(height: AppSpace.xs),
          Text(
            'Элсэлтийн шалгалтад бэлдэх болон математикийн хоцрогдол арилгах танхимын сургалттай. Өөрийн түвшин, '
            'хуваарьт тохирох ангийн мэдээллийг төвөөс авна',
            style: dim,
          ),
          const SectionHeader(title: 'Салбарууд'),
          for (final b in centreBranches) ...[
            AppCard(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.pin, size: 18, color: context.colors.brand),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(b.label, style: context.text.titleSmall),
                        const SizedBox(height: 2),
                        Text(b.address, style: context.text.bodyMedium),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpace.sm),
          ],
          const SectionHeader(title: 'Холбоо барих'),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (final p in OrgInfo.phones)
                  ListTile(
                    leading: const Icon(AppIcons.phone),
                    title: Text(p),
                    onTap: () => launchUrl(Uri.parse('tel:${p.replaceAll(' ', '')}')),
                  ),
                ListTile(
                  leading: const Icon(AppIcons.mail),
                  title: const Text(OrgInfo.email),
                  onTap: () => launchUrl(Uri.parse('mailto:${OrgInfo.email}')),
                ),
              ],
            ),
          ),
          const SectionHeader(title: 'Элсэлт'),
          Text(
            'Түвшин тогтоох шалгалт өгөөд бодолтын зургаа илгээвэл ажилтан шалгаж, тохирох анги ба ирэх цагийг '
            'тодруулна. Хүсэлт илгээх нь ангийн суудал шууд батлагдсан гэсэн үг биш',
            style: dim,
          ),
          const SizedBox(height: AppSpace.sm),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: OutlinedButton.icon(
              icon: const Icon(AppIcons.goal, size: 18),
              label: const Text('Түвшин тогтоох шалгалт'),
              onPressed: () => context.push('/placement'),
            ),
          ),
        ],
      ),
    );
  }
}
