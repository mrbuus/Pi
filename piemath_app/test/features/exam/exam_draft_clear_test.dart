import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_draft_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('clearExamDrafts: зөвхөн exam_draft: түлхүүрүүдийг устгана', () async {
    SharedPreferences.setMockInitialValues({
      'exam_draft:u1:t1': '{"answers":{"p1":2},"states":{}}',
      'exam_draft:u2:t9': '{"answers":{"p1":1},"states":{}}',
      'theme_mode': 'dark',
      'exam_notes': 'үлдэнэ',
    });
    final prefs = await SharedPreferences.getInstance();

    final removed = await clearExamDrafts(prefs);

    expect(removed, 2);
    expect(prefs.getKeys(), {'theme_mode', 'exam_notes'});
    final store = PrefsExamDraftStore(prefs);
    expect((await store.read('u1', 't1')).isEmpty, isTrue);
  });

  test('clearExamDrafts: prefs өгөхгүй бол өгөгдмөл экземпляр; хоосон үед 0', () async {
    SharedPreferences.setMockInitialValues({'exam_draft:u1:t1': '{}', 'x': '1'});
    expect(await clearExamDrafts(), 1);
    expect(await clearExamDrafts(), 0);
    expect((await SharedPreferences.getInstance()).getString('x'), '1');
  });
}
