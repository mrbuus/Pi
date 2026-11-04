// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'current_user.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_CurrentUser _$CurrentUserFromJson(Map<String, dynamic> json) => _CurrentUser(
  id: json['id'] as String,
  role: $enumDecode(
    _$UserRoleEnumMap,
    json['role'],
    unknownValue: UserRole.unknown,
  ),
  firstName: json['firstName'] as String? ?? '',
  lastName: json['lastName'] as String?,
  phone: json['phone'] as String?,
  email: json['email'] as String?,
  username: json['username'] as String?,
  studentCode: json['studentCode'] as String?,
  teacherCode: json['teacherCode'] as String?,
  avatarUrl: json['avatarUrl'] as String?,
  mustChangePassword: json['mustChangePassword'] as bool? ?? false,
  studentProfile: json['studentProfile'] as Map<String, dynamic>?,
  teacherProfile: json['teacherProfile'] as Map<String, dynamic>?,
  externalTeacherProfile:
      json['externalTeacherProfile'] as Map<String, dynamic>?,
);

Map<String, dynamic> _$CurrentUserToJson(_CurrentUser instance) =>
    <String, dynamic>{
      'id': instance.id,
      'role': _$UserRoleEnumMap[instance.role]!,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'phone': instance.phone,
      'email': instance.email,
      'username': instance.username,
      'studentCode': instance.studentCode,
      'teacherCode': instance.teacherCode,
      'avatarUrl': instance.avatarUrl,
      'mustChangePassword': instance.mustChangePassword,
      'studentProfile': instance.studentProfile,
      'teacherProfile': instance.teacherProfile,
      'externalTeacherProfile': instance.externalTeacherProfile,
    };

const _$UserRoleEnumMap = {
  UserRole.admin: 'ADMIN',
  UserRole.teacherPlus: 'TEACHER_PLUS',
  UserRole.teacher: 'TEACHER',
  UserRole.student: 'STUDENT',
  UserRole.parent: 'PARENT',
  UserRole.buyer: 'BUYER',
  UserRole.groupTeacher: 'GROUP_TEACHER',
  UserRole.unknown: 'unknown',
};
