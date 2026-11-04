// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'support_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_HelpTopic _$HelpTopicFromJson(Map<String, dynamic> json) =>
    _HelpTopic(id: json['id'] as String, question: json['question'] as String);

Map<String, dynamic> _$HelpTopicToJson(_HelpTopic instance) =>
    <String, dynamic>{'id': instance.id, 'question': instance.question};

_HelpSource _$HelpSourceFromJson(Map<String, dynamic> json) => _HelpSource(
  label: json['label'] as String? ?? '',
  href: json['href'] as String? ?? '',
);

Map<String, dynamic> _$HelpSourceToJson(_HelpSource instance) =>
    <String, dynamic>{'label': instance.label, 'href': instance.href};

_HelpMatch _$HelpMatchFromJson(Map<String, dynamic> json) => _HelpMatch(
  id: json['id'] as String,
  question: json['question'] as String? ?? '',
  answer: json['answer'] as String? ?? '',
  source: json['source'] == null
      ? null
      : HelpSource.fromJson(json['source'] as Map<String, dynamic>),
);

Map<String, dynamic> _$HelpMatchToJson(_HelpMatch instance) =>
    <String, dynamic>{
      'id': instance.id,
      'question': instance.question,
      'answer': instance.answer,
      'source': instance.source,
    };

_HelpReply _$HelpReplyFromJson(Map<String, dynamic> json) => _HelpReply(
  matches:
      (json['matches'] as List<dynamic>?)
          ?.map((e) => HelpMatch.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const <HelpMatch>[],
  fallback: json['fallback'] as String?,
);

Map<String, dynamic> _$HelpReplyToJson(_HelpReply instance) =>
    <String, dynamic>{
      'matches': instance.matches,
      'fallback': instance.fallback,
    };

_FeedbackTicket _$FeedbackTicketFromJson(Map<String, dynamic> json) =>
    _FeedbackTicket(
      id: json['id'] as String,
      kind: json['kind'] as String,
      subject: json['subject'] as String? ?? '',
      body: json['body'] as String? ?? '',
      state: json['state'] as String? ?? 'OPEN',
      response: json['response'] as String?,
      contextPath: json['contextPath'] as String?,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$FeedbackTicketToJson(_FeedbackTicket instance) =>
    <String, dynamic>{
      'id': instance.id,
      'kind': instance.kind,
      'subject': instance.subject,
      'body': instance.body,
      'state': instance.state,
      'response': instance.response,
      'contextPath': instance.contextPath,
      'createdAt': instance.createdAt,
    };
