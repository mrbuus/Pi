import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/ui/ui.dart';
import '../data/books_models.dart';
import '../data/books_repository.dart';
import '../domain/book_meta.dart';
import 'books_common.dart';

/// Номын каталог (`/books`, нэвтрэлтгүй) — вэбийн `BooksWorkspace` (ном сонгох хэсэг).
class BooksScreen extends ConsumerWidget {
  const BooksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(booksCatalogProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Ном, тест')),
      body: async.when(
        loading: () => const LoadingState(),
        error: (e, _) => publicError(e, onRetry: () => ref.invalidate(booksCatalogProvider)),
        data: (books) => RefreshIndicator(
          onRefresh: () => ref.refresh(booksCatalogProvider.future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
            children: [
              Text(
                'Сэдэв бүрийн эхний тестийг нэвтрэлтгүй, шууд бодож үзээрэй',
                style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
              ),
              const SizedBox(height: AppSpace.lg),
              if (books.isEmpty)
                const EmptyState(title: 'Ном удахгүй нэмэгдэнэ')
              else
                for (final b in books) ...[_BookCard(book: b), const SizedBox(height: AppSpace.md)],
              const SectionHeader(title: 'Бусад'),
              _LinkCard(
                icon: BooksIcons.mock,
                title: 'Жишиг сорил',
                subtitle: 'ЭЕШ-ийн бүтэцтэй, хугацаатай онлайн сорил',
                onTap: () => context.push('/sorils'),
              ),
              const SizedBox(height: AppSpace.md),
              _LinkCard(
                icon: BooksIcons.placement,
                title: 'Түвшин тогтоох шалгалт',
                subtitle: 'Тест бодоод багш түвшинг чинь тогтооно',
                onTap: () => context.push('/placement'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BookCard extends StatelessWidget {
  const _BookCard({required this.book});

  final BookSummary book;

  @override
  Widget build(BuildContext context) {
    final name = bookDisplayName(book.code, book.title, book.displayName);
    final meta = bookMeta[book.code];
    final ready = book.solvableTests > 0;
    return AppCard(
      accent: context.colors.logo,
      semanticLabel: name,
      onTap: () => context.push('/books/${Uri.encodeComponent(book.code)}'),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                BookName(name, style: context.text.titleMedium),
                if (meta != null) Text(meta.sub, style: context.text.bodySmall),
                const SizedBox(height: AppSpace.xs),
                Meta(
                  items: ready
                      ? [
                          '${book.topics} сэдэв',
                          '${book.tests} тест',
                          if (book.freeTests > 0) '${book.freeTests} үнэгүй',
                        ]
                      : ['Удахгүй'],
                ),
              ],
            ),
          ),
          Icon(AppIcons.forward, color: context.colors.inkDim),
        ],
      ),
    );
  }
}

class _LinkCard extends StatelessWidget {
  const _LinkCard({required this.icon, required this.title, required this.subtitle, required this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, color: context.colors.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: context.text.titleSmall),
                Text(subtitle, style: context.text.bodySmall),
              ],
            ),
          ),
          Icon(AppIcons.forward, color: context.colors.inkDim),
        ],
      ),
    );
  }
}
