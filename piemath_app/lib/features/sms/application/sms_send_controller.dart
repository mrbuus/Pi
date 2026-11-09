import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/strings.dart';
import '../../../shared/payment_status/money.dart';
import '../data/sms_models.dart';
import '../data/sms_repository.dart';
import '../domain/sms_logic.dart';

/// «Илгээх» табын төлөв (вэбийн `SmsSend.tsx`-ийн дүрэм):
///
/// 1. Олон дугаартай бол эхлээд серверээс тооцоо (`/sms/bulk/estimate`). Дугаар, бичвэр өөрчлөгдвөл тооцоо хүчингүй.
/// 2. Илгээхийн өмнө UI баталгаажуулах цонх (хүлээн авагчийн тоо, өртөг) — [SmsSendState.confirmText].
/// 3. Давхар илгээлтээс хамгаалалт: явж буй үед дахин дарахад юу ч хийхгүй; ноорог үүссэн бол дахин ноорог
///    үүсгэхгүйгээр зөвхөн эхлүүлнэ (`pendingBatchId`).
@immutable
class SmsSendState {
  const SmsSendState({
    this.recipients = '',
    this.text = '',
    this.estimate,
    this.estimateKey,
    this.estimating = false,
    this.sending = false,
    this.pendingBatchId,
    this.error,
    this.success,
  });

  final String recipients;
  final String text;
  final SmsEstimate? estimate;
  final String? estimateKey;
  final bool estimating;
  final bool sending;

  /// Ноорог үүссэн ч эхлүүлэх алхам амжилтгүй болсон — дахин дарахад ЗӨВХӨН эхлүүлнэ.
  final String? pendingBatchId;
  final String? error;
  final String? success;

  List<String> get phones => parsePhones(recipients);

  bool get isBulk => phones.length > 1;

  bool get hasText => text.trim().isNotEmpty;

  SmsSegmentPreview get preview => previewSmsSegments(text);

  bool get estimateIsCurrent => estimate != null && estimateKey == smsRequestKey(phones, text);

  bool get canEstimate => isBulk && hasText && !estimating && !sending;

  bool get canSend => phones.isNotEmpty && hasText && !sending && !estimating && (!isBulk || estimateIsCurrent);

  /// Баталгаажуулах цонхны бичвэр — хэдэн хүнд, ойролцоогоор хэд.
  String get confirmText {
    if (!isBulk) {
      return '${phones.first} дугаар руу ${preview.segments} хэсэг SMS илгээнэ. Илгээсний дараа буцаах боломжгүй';
    }
    final e = estimate!;
    return '${e.deduplicatedCount} хүлээн авагч, ${e.estimatedSegments} хэсэг, ойролцоогоор '
        '${formatMnt(e.estimatedCost)}. Илгээсний дараа буцаах боломжгүй';
  }

  SmsSendState copyWith({
    String? recipients,
    String? text,
    SmsEstimate? Function()? estimate,
    String? Function()? estimateKey,
    bool? estimating,
    bool? sending,
    String? Function()? pendingBatchId,
    String? Function()? error,
    String? Function()? success,
  }) => SmsSendState(
    recipients: recipients ?? this.recipients,
    text: text ?? this.text,
    estimate: estimate == null ? this.estimate : estimate(),
    estimateKey: estimateKey == null ? this.estimateKey : estimateKey(),
    estimating: estimating ?? this.estimating,
    sending: sending ?? this.sending,
    pendingBatchId: pendingBatchId == null ? this.pendingBatchId : pendingBatchId(),
    error: error == null ? this.error : error(),
    success: success == null ? this.success : success(),
  );
}

String _message(Object e, String fallback) => e is ApiError ? e.message : fallback;

class SmsSendController extends Notifier<SmsSendState> {
  /// Синхрон түгжээ — `state.sending` шинэчлэгдэхээс өмнөх хоёр дахь товшилтыг ч хаана.
  bool _inFlight = false;

  @override
  SmsSendState build() => const SmsSendState();

  SmsRepository get _repo => ref.read(smsRepositoryProvider);

  /// Оролт өөрчлөгдөхөд тооцоо, ноорог, мессеж хүчингүй (вэбийн `changeInput`).
  SmsSendState _reset(SmsSendState s) => s.copyWith(
    estimate: () => null,
    estimateKey: () => null,
    pendingBatchId: () => null,
    error: () => null,
    success: () => null,
  );

  void setRecipients(String value) {
    if (state.sending || value == state.recipients) return;
    state = _reset(state.copyWith(recipients: value));
  }

  void setText(String value) {
    if (state.sending || value == state.text) return;
    state = _reset(state.copyWith(text: value));
  }

  /// Серверийн тооцоо. Ижил биеийг дараа нь `/sms/bulk` руу илгээнэ.
  Future<void> fetchEstimate() async {
    if (!state.canEstimate || _inFlight) return;
    final phones = state.phones;
    final text = state.text;
    state = state.copyWith(
      estimating: true,
      error: () => null,
      success: () => null,
      pendingBatchId: () => null,
    );
    try {
      final e = await _repo.estimate(phones: phones, text: text);
      if (!ref.mounted) return;
      // Хүлээх зуур оролт өөрчлөгдсөн бол хуучин тооцоог хэрэглэхгүй.
      if (smsRequestKey(state.phones, state.text) != smsRequestKey(phones, text)) {
        state = state.copyWith(estimating: false);
        return;
      }
      state = state.copyWith(
        estimating: false,
        estimate: () => e,
        estimateKey: () => smsRequestKey(phones, text),
      );
    } catch (e) {
      if (!ref.mounted) return;
      state = state.copyWith(
        estimating: false,
        estimate: () => null,
        estimateKey: () => null,
        error: () => _message(e, 'Өртгийн тооцоо авч чадсангүй'),
      );
    }
  }

  /// Илгээнэ (UI баталгаажуулсны ДАРАА). Амжилттай бол `true`. Явж байхад дуудвал юу ч хийхгүй (`false`).
  Future<bool> send() async {
    if (_inFlight || !state.canSend) return false;
    _inFlight = true;
    state = state.copyWith(sending: true, error: () => null, success: () => null);
    try {
      final String success;
      if (state.isBulk) {
        var batchId = state.pendingBatchId;
        if (batchId == null) {
          batchId = await _repo.createBulk(phones: state.phones, text: state.text);
          if (!ref.mounted) return false;
          state = state.copyWith(pendingBatchId: () => batchId);
        }
        final started = await _repo.startBulk(batchId);
        success = '${started.queued} дугаарын илгээлт эхэллээ';
      } else {
        final r = await _repo.send(phone: state.phones.first, text: state.text);
        success = 'Мессеж илгээгдлээ, ${r.segments} хэсэг';
      }
      if (!ref.mounted) return true;
      state = SmsSendState(success: success);
      return true;
    } catch (e) {
      if (ref.mounted) {
        state = state.copyWith(
          sending: false,
          error: () => _message(e, state.isBulk ? 'Бөөн илгээлтийг эхлүүлж чадсангүй' : AppStrings.genericError),
        );
      }
      return false;
    } finally {
      _inFlight = false;
    }
  }
}

final smsSendControllerProvider = NotifierProvider.autoDispose<SmsSendController, SmsSendState>(SmsSendController.new);
