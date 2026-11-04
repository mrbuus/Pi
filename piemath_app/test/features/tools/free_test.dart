import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/tools/domain/figure.dart';
import 'package:piemath_app/features/tools/domain/free.dart';
import 'package:piemath_app/features/tools/domain/geom.dart';

FreeState taps(List<Pt> pts, {FreeState start = const FreeState()}) {
  var s = start;
  for (final p in pts) {
    s = tapSegment(s, p, tol: 0.3, grid: 1);
  }
  return s;
}

void main() {
  test('Шулуун горим: хоёр цэг → хэрчим, нэр A, B', () {
    final s = taps(const [Pt(0, 0), Pt(3.1, 0.2)]);
    expect(s.points.map((p) => p.name), ['A', 'B']);
    expect(s.points[1].p, const Pt(3, 0)); // торонд наалдсан
    expect(s.segs.length, 1);
    expect(s.pending, s.points[1].id);
    final m = freeMetrics(s);
    expect(m.single.rows.single.tex, 'AB=3');
  });

  test('хүрээ хаагдвал гурвалжин үүсч, тооцоо гарна', () {
    final s = taps(const [Pt(0, 0), Pt(4, 0), Pt(0, 3), Pt(0, 0)]);
    expect(s.polys.length, 1);
    expect(s.pending, isNull);
    expect(s.selected?.kind, FreeKind.polygon);
    final m = freeMetrics(s);
    Metric by(String n) => m.firstWhere((x) => x.name == n);
    expect(by('Талбай').tex, 'S=6');
    expect(by('Периметр').tex, endsWith('=12'));
    expect(by('Төрөл').text, contains('тэгш өнцөгт'));
    expect(by('Өнцгүүд').tex, contains(r'\angle A=90^\circ'));
    expect(by('Багтсан тойргийн радиус').tex, endsWith('=1'));
    // Зурагт өнцгийн тэмдэг
    expect(freePrims(s).whereType<AnglePrim>().length, 3);
  });

  test('квадрат, тэгш өнцөгт таних; давхар дүрс үүсэхгүй', () {
    final sq = taps(const [Pt(0, 0), Pt(2, 0), Pt(2, 2), Pt(0, 2), Pt(0, 0)]);
    expect(freeMetrics(sq).first.text, 'Квадрат');
    expect(freeMetrics(sq).firstWhere((m) => m.name == 'Диагоналиуд').tex, contains(r'2\sqrt{2}'));
    final rect = taps(const [Pt(0, 0), Pt(3, 0), Pt(3, 2), Pt(0, 2), Pt(0, 0)]);
    expect(freeMetrics(rect).first.text, 'Тэгш өнцөгт');
    final again = taps(const [Pt(0, 0), Pt(3, 0)], start: rect);
    expect(again.polys.length, 1);
  });

  test('өмнөх цэгээ дахин товшвол гинж дуусна', () {
    final s = taps(const [Pt(0, 0), Pt(0, 0)]);
    expect(s.pending, isNull);
    expect(s.points.length, 1);
  });

  test('сонгох, устгах хамааралтай объектыг хасна', () {
    var s = taps(const [Pt(0, 0), Pt(4, 0), Pt(0, 3), Pt(0, 0)]);
    final b = s.points[1];
    s = s.copyWith(selected: () => s.hitTest(const Pt(4.1, 0.1), 0.3, 0.2));
    expect(s.selected, (kind: FreeKind.point, id: b.id));
    s = s.removeSelected();
    expect(s.points.length, 2);
    expect(s.segs.length, 1);
    expect(s.polys, isEmpty);
    // хэрчмийг сонгож устгах
    final hit = s.hitTest(const Pt(0, 1.5), 0.3, 0.2);
    expect(hit?.kind, FreeKind.segment);
    s = s.copyWith(selected: () => hit).removeSelected();
    expect(s.segs, isEmpty);
  });

  test('дүрсийн дотор товшвол дүрс сонгогдоно; цэг зөөхөд тооцоо шинэчлэгдэнэ', () {
    var s = taps(const [Pt(0, 0), Pt(4, 0), Pt(0, 3), Pt(0, 0)]);
    expect(s.hitTest(const Pt(1, 1), 0.3, 0.2)?.kind, FreeKind.polygon);
    s = s.movePoint(s.points[1].id, const Pt(6, 0)).copyWith(selected: () => null);
    expect(freeMetrics(s).firstWhere((m) => m.name == 'Талбай').tex, 'S=9');
  });

  test('Цэг горим, нэр давтагдахгүй', () {
    var s = const FreeState();
    for (var i = 0; i < 27; i++) {
      s = tapPoint(s, Pt(i * 2.0, 0), tol: 0.3, grid: 1);
    }
    expect(s.points.last.name, 'A_1');
    expect(snap(const Pt(1.4, -0.6), 1), const Pt(1, -1));
  });
}
