import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';

/// Бодолт хаалттай шалтгаан (`GET /scan/:code`-ийн `lockReason`). Шалтгааныг сервер шийднэ.
enum ScanLockReason {
  noSolution,
  notInTest,
  notTaken,
  waiting;

  static ScanLockReason? fromApi(Object? v) => switch (v) {
        'NO_SOLUTION' => noSolution,
        'NOT_IN_TEST' => notInTest,
        'NOT_TAKEN' => notTaken,
        'WAITING' => waiting,
        _ => null,
      };
}

/// Хаалттай үеийн гарчиг, бичвэр — вэбийн `components/scan/lockMessage.ts`-тэй ЯГ ижил.
/// Өнгө аяс: тайлбарлах, буруутгахгүй (STATUS §6.10).
({String title, String body}) lockMessage(ScanLockReason reason, DateTime? opensAt) => switch (reason) {
      ScanLockReason.waiting => (
          title: 'Бодолт удахгүй нээгдэнэ',
          body: opensAt != null
              ? 'Шалгалтаа өгсөн байна. Бодолт ${DateMn.numericWithTime(UbDateTime.fromInstant(opensAt))}-д нээгдэнэ.'
              : 'Шалгалтаа өгсөн байна. Багш нээсний дараа бодолт харагдана.',
        ),
      ScanLockReason.notTaken => (
          title: 'Эхлээд өөрөө бодоод үзээрэй',
          body: 'Энэ бодлого орсон шалгалтаа өгсний дараа бодолт нь нээгдэнэ.',
        ),
      ScanLockReason.notInTest => (
          title: 'Бодолт хараахан нээгдээгүй',
          body: 'Энэ бодлого одоогоор шалгалтад ороогүй тул бодолтыг харах боломжгүй.',
        ),
      ScanLockReason.noSolution => (
          title: 'Бодолт бэлтгэгдэж байна',
          body: 'Энэ бодлогын бодолтыг багш нар бичиж байна.',
        ),
    };
