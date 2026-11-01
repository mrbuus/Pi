import 'package:freezed_annotation/freezed_annotation.dart';

part 'support_models.freezed.dart';
part 'support_models.g.dart';

/// `GET /centre-help/topics` мөр.
@freezed
abstract class HelpTopic with _$HelpTopic {
  const factory HelpTopic({required String id, required String question}) = _HelpTopic;

  factory HelpTopic.fromJson(Map<String, Object?> json) => _$HelpTopicFromJson(json);
}

@freezed
abstract class HelpSource with _$HelpSource {
  const factory HelpSource({@Default('') String label, @Default('') String href}) = _HelpSource;

  factory HelpSource.fromJson(Map<String, Object?> json) => _$HelpSourceFromJson(json);
}

@freezed
abstract class HelpMatch with _$HelpMatch {
  const factory HelpMatch({
    required String id,
    @Default('') String question,

    /// Урьдчилан бичсэн хариулт (LaTeX байж болно — MathText).
    @Default('') String answer,
    HelpSource? source,
  }) = _HelpMatch;

  factory HelpMatch.fromJson(Map<String, Object?> json) => _$HelpMatchFromJson(json);
}

/// `POST /centre-help/ask` — AI биш, урьдчилан бичсэн хариултаас хайлт.
@freezed
abstract class HelpReply with _$HelpReply {
  const factory HelpReply({@Default(<HelpMatch>[]) List<HelpMatch> matches, String? fallback}) = _HelpReply;

  factory HelpReply.fromJson(Map<String, Object?> json) => _$HelpReplyFromJson(json);
}

/// `/feedback` хүсэлт.
@freezed
abstract class FeedbackTicket with _$FeedbackTicket {
  const factory FeedbackTicket({
    required String id,

    /// BUG | SUGGESTION | QUESTION
    required String kind,
    @Default('') String subject,
    @Default('') String body,

    /// OPEN | IN_REVIEW | RESOLVED
    @Default('OPEN') String state,
    String? response,
    String? contextPath,
    required String createdAt,
  }) = _FeedbackTicket;

  factory FeedbackTicket.fromJson(Map<String, Object?> json) => _$FeedbackTicketFromJson(json);
}
