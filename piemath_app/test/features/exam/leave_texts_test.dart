import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/integrity/integrity.dart';
import 'package:piemath_app/features/exam/domain/leave_texts.dart';

void main() {
  const strict = LeavePolicy.strict;
  const lenient = LeavePolicy.lenient;

  test('дэс тооны нөхцөл', () {
    expect(ordinal(1), '1 дэх');
    expect(ordinal(2), '2 дахь');
    expect(ordinal(3), '3 дахь');
    expect(ordinal(4), '4 дэх');
    expect(ordinal(9), '9 дэх');
    expect(ordinal(10), '10 дахь');
  });

  test('интро: горимоос хамаарч яг үнэн дүрэм', () {
    expect(
      leaveRuleIntro(lenient),
      'Шалгалтын үеэр аппаас гарвал багшид харагдана. 1, 2 дахь удаад анхааруулга гарч, '
      '3 дахь удаад шалгалт автоматаар илгээгдэнэ. 2 секундээс богино хугацаанд гарсныг тооцохгүй.',
    );
    expect(
      leaveRuleIntro(strict),
      'Шалгалтын үеэр аппаас гарвал багшид харагдана. 1 дэх удаад сүүлчийн анхааруулга гарч, '
      '2 дахь удаад шалгалт автоматаар илгээгдэнэ. 2 секундээс богино хугацаанд гарсныг тооцохгүй.',
    );
  });

  test('буцаж ирэхэд: сүүлчийн анхааруулга, эсвэл хэд дэх гаралтад илгээгдэх', () {
    // Хатуу: 1 дэх гаралт нь шууд сүүлчийн анхааруулга.
    expect(leaveNoticeHint(strict, 1), 'Дахин гарвал шалгалт автоматаар илгээгдэнэ');
    // Зөөлөн: 1 дэх гаралтын дараа 1 анхааруулга үлдэнэ, 2 дахь нь сүүлчийнх.
    expect(leaveNoticeHint(lenient, 1), '3 дахь гаралтад шалгалт автоматаар илгээгдэнэ, дахин 1 удаа анхааруулга авна');
    expect(leaveNoticeHint(lenient, 2), 'Дахин гарвал шалгалт автоматаар илгээгдэнэ');
  });

  test('автомат илгээлтийн шалтгаан', () {
    expect(leavesFinishedText(2), 'Аппаас 2 удаа гарсан тул шалгалт илгээгдлээ');
    expect(leavesFinishedText(3), 'Аппаас 3 удаа гарсан тул шалгалт илгээгдлээ');
  });
}
