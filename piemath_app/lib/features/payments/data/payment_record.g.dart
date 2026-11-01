// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_record.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_PaymentRecord _$PaymentRecordFromJson(Map<String, dynamic> json) =>
    _PaymentRecord(
      id: json['id'] as String,
      amount: json['amount'] as num,
      method: json['method'] as String?,
      status: json['status'] as String,
      description: json['description'] as String?,
      forMonth: json['forMonth'] as String?,
      paidAt: json['paidAt'] as String?,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$PaymentRecordToJson(_PaymentRecord instance) =>
    <String, dynamic>{
      'id': instance.id,
      'amount': instance.amount,
      'method': instance.method,
      'status': instance.status,
      'description': instance.description,
      'forMonth': instance.forMonth,
      'paidAt': instance.paidAt,
      'createdAt': instance.createdAt,
    };

_MyClassroom _$MyClassroomFromJson(Map<String, dynamic> json) => _MyClassroom(
  id: json['id'] as String,
  name: json['name'] as String? ?? '',
  type: json['type'] as String,
  grade: (json['grade'] as num?)?.toInt(),
);

Map<String, dynamic> _$MyClassroomToJson(_MyClassroom instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'type': instance.type,
      'grade': instance.grade,
    };
