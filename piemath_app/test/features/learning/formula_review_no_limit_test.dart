import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/learning/data/formula_review_models.dart';

Map<String, Object?> _card(String slug, {String? latex, String mode = 'flashcard', String? group}) => {
  'slug': slug,
  'title': slug,
  'latex': latex,
  'exercise': {'mode': mode, 'token': 't-$slug', 'groupId': ?group, 'options': <Object>[]},
};

void main() {
  test('хязгаарын томьёо, түүнтэй нэг бүлгийн карт давтлагад гарахгүй', () {
    final due = ReviewDue.fromJson({
      'dueCount': 6,
      'newCount': 0,
      'cards': [
        _card('calc-limit-sine', latex: r'\lim_{x\to0}\frac{\sin x}{x}=1'),
        _card('fn-e-number'),
        _card('x-other', latex: r'\lim_{n\to\infty}a_n'),
        _card('m1', mode: 'match', group: 'g1'),
        _card('calc-derivative-definition', mode: 'match', group: 'g1'),
        _card('trig-sum', latex: r'\sin^2x+\cos^2x=1'),
      ],
    });
    expect(due.cards.map((c) => c.slug), ['trig-sum']);
  });
}
