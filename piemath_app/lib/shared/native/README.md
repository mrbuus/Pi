# Нийтлэг бүрэлдэхүүн (давалгаа 0)

Вэбгүй апп-ын бүх шинэ дэлгэц эдгээрээр бүтнэ (`docs/NATIVE-PLAN.md` §3). Нэг импорт:

```dart
import 'package:piemath_app/shared/native/native.dart';
```

Дүрэм: өнгө зөвхөн `context.colors`, дүрс зөвхөн `AppIcons`, бичвэр монголоор, гарчиг цэггүй,
товч 48dp-ээс багагүй. Хөдөлгөөн `AppMotion.reduced` болон сул утсанд (`PerfTier.low`) өөрөө унтарна.

## Аль нь хэзээ

| Хэрэгцээ | Бүрэлдэхүүн |
|---|---|
| Жагсаалт: хайлт, шүүлтүүр, хуудаслалт, таблетад 2 багана | `DataListScreen<T>` + `ItemRow` |
| Дэлгэрэнгүйн толгой (нэр, чип, товч) | `DetailHeader`, `DetailAvatar`, `MetaChip` |
| Нэмэх, засах маягт | `showFormSheet` + `Form*Field` |
| Нэгийг сонгох жагсаалт | `showSelectSheet` |
| Устгах, архивлах | `confirmAction` + `showUndoSnack` |
| Хуваарь | `WeekStrip` + `DayAgenda` |
| Самбарын 3–4 тоо | `StatRow` + `StatTile` |
| Excel, PDF татах, хуваалцах | `fileShareProvider` (`FileShare`) |
| Шууд харагдах өөрчлөлт, алдаа бол буцаах | `OptimisticNotifier`, `optimisticMutation`, `showMutationError` |

## DataListScreen

Хуудасны зөвхөн бие — `Scaffold`-ыг дэлгэц өөрөө өгнө. API бүтэн жагсаалт буцаадаг бол `DataPage.local`.

```dart
Scaffold(
  appBar: AppBar(title: const Text('Сурагчид')),
  body: DataListScreen<Student>(
    load: (q) async => DataPage.local(
      await ref.read(studentsRepoProvider).all(),
      q,
      matches: (s, text) => s.name.toLowerCase().contains(text) || s.phone.contains(text),
      inFilter: (s, f) => s.status == f,
      filters: filters,
    ),
    itemKey: (s) => s.id,
    searchHint: 'Нэр, утсаар хайх',
    filters: const [DataFilter('paid', 'Төлсөн'), DataFilter('debt', 'Өртэй')],
    countLabel: (n) => '$n сурагч',
    itemBuilder: (_, s) => ItemRow(title: s.name, meta: [s.className, s.phone], chevron: true),
    onTap: (s) => context.push('/app/admin/students/${s.id}'),
    detailBuilder: (_, s) => StudentDetail(id: s.id), // таблетад баруун талд
    emptyTitle: 'Сурагч алга',
  ),
)
```

- Серверийн хуудаслалт: `load` нь `q.search`, `q.filter`, `q.cursor`-ыг query болгоод `DataPage(items, nextCursor, total, filterCounts)` буцаана.
- Гаднаас удирдах: `DataListController` — `refresh()`, `updateWhere`, `removeWhere`, `insert`, `setItems`.
- Гаднын шүүлтүүр (жишээ нь сонгосон анги) солигдоход `reloadKey: classId`.
- `header:` (жишээ нь `StatRow`) хайлтын дээр, `summaryBuilder:` тооны доор наалдана.

## FormSheet

Доороос гарна, хуруугаар чирж өндрийг солино, гар гарахад дээшилнэ. Алдааг монголоор (`FormMessages`) харуулна.
Хадгалаагүй өөрчлөлттэй хаах гэвэл «Хадгалаагүй өөрчлөлт байна» гэж асууна. Амжилттай бол `onSubmit`-ийн үр дүн,
хаавал `null`. Серверийн алдаа (`ApiError.message`) маягт дотор гарч, маягт хаагдахгүй.

```dart
final saved = await showFormSheet<Lesson>(
  context,
  title: 'Хичээл нэмэх',
  fields: [
    FormTextField(name: 'title', label: 'Нэр', required: true),
    FormSelectField<String>(name: 'room', label: 'Танхим', options: rooms, required: true),
    FormDateField(name: 'day', label: 'Өдөр', initial: UbDateTime.now(), required: true),
    FormTimeField(name: 'start', label: 'Эхлэх цаг', required: true),
    FormNumberField(name: 'minutes', label: 'Үргэлжлэх', suffixText: 'мин', min: 30, max: 240),
    FormMoneyField(name: 'fee', label: 'Төлбөр'),
    FormPhoneField(name: 'phone'),
    FormMultiSelectField<int>(name: 'days', label: 'Гараг', options: weekdays),
    const FormSwitchField(name: 'online', label: 'Онлайн'),
  ],
  onSubmit: (v) => repo.create(
    title: v.text('title'),
    room: v.get<String>('room')!,
    day: v.date('day')!,
    start: v.time('start')!,
    minutes: v.integer('minutes'),
    fee: v.integer('fee'),
    days: v.many<int>('days'),
    online: v.boolean('online'),
  ),
);
if (saved != null) list.insert(0, saved);
```

Огноо нь `UbDateTime` (Улаанбаатар), мөнгө `int` төгрөг, утас 8 оронтой `String`.

## Устгах, буцаах

Прод өгөгдөл зөөлөн устгагдана — гэхдээ хэрэглэгчид эхлээд асуу, дараа нь «Буцаах» боломж өг:

```dart
if (!await confirmAction(context, title: 'Сурагчийг архивлах уу', confirmLabel: 'Архивлах')) return;
final removed = list.removeWhere((s) => s.id == id);
if (await showUndoSnack(context, message: 'Архивлалаа')) {
  list.insert(removed!.index, removed.item);   // «Буцаах»
} else {
  await repo.archive(id);                       // 5 сек өнгөрсөн
}
```

## Хуваарь

```dart
Column(children: [
  WeekStrip(
    selected: day,
    counts: lessonsPerDay,                 // {'2026-11-04': 3}
    onSelected: (d) => setState(() => day = d),
    onWeekChanged: (monday) => loadWeek(monday),
  ),
  Expanded(
    child: DayAgenda(
      day: day,
      events: [for (final l in lessons) AgendaEvent(id: l.id, start: l.start, end: l.end, title: l.title, subtitle: l.room)],
      onEventTap: (e) => openLesson(e.id),
      onSlotTap: canEdit ? (t) => addLesson(t) : null,   // Багш зөвхөн харна
      emptyText: 'Энэ өдөр хичээлгүй',
    ),
  ),
])
```

Давхцсан хичээл зэрэгцээ баганад (`layoutAgenda`), өнөөдөр «одоо» шугамтай, минут тутам шинэчлэгдэнэ.

## Тоо

```dart
StatRow(tiles: [
  StatTile(label: 'Сурагч', value: '128', onTap: () => context.push('/app/admin/students')),
  StatTile(label: 'Өртэй', value: '12', tone: ChipTone.warning, icon: AppIcons.warning),
  StatTile(label: 'Ирц', value: '94%', hint: 'өчигдрөөс +2'),
])
```

`value`-д монгол үсэг бүү бич (Unbounded фонтод Ү, Ө байхгүй).

## Файл хуваалцах

```dart
final files = ref.read(fileShareProvider);
await files.share('/tuition/export', query: {'month': '2026-11'}, fileName: 'tolbor-11.xlsx');
await files.previewPdf(context, '/tests/$id/pdf', title: 'Тестийн хуудас');
```

Токен зөвхөн толгойд, S3 redirect-ийг толгойгүй дагана. Шинэ сан нэмээгүй (`dio`, `share_plus`, `pdfx`, `path_provider`).

## Optimistic өөрчлөлт

```dart
class TasksController extends Notifier<List<Task>> with OptimisticNotifier<List<Task>> {
  @override
  List<Task> build() => const [];

  Future<MutationResult<Task>> markDone(String id) => mutate(
    apply: (l) => [for (final t in l) t.id == id ? t.copyWith(done: true) : t],
    commit: () => ref.read(tasksRepoProvider).markDone(id),
    revert: (l) => [for (final t in l) t.id == id ? t.copyWith(done: false) : t],
    confirm: (l, saved) => [for (final t in l) t.id == id ? saved : t],
  );
}

// UI
final r = await ref.read(tasksProvider.notifier).markDone(id);
if (context.mounted) showMutationError(context, r, onRetry: () => retry(id));
```

`revert`-ийг өгвөл тухайн мөрийг л буцаана (хүлээх зуур гарсан өөр өөрчлөлт хадгалагдана); өгөхгүй бол өмнөх төлөв бүхэлдээ.
`DataListController`-той: `optimisticMutation(read: () => list.items, write: list.setItems, ...)`.
