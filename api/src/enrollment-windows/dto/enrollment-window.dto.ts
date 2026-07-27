import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  EnrollmentStatus,
  SubjectAvailability,
} from '../../generated/prisma/enums';

// PATCH /enrollment-windows/:subject — талбар бүр сонголтоор ирнэ, зөвхөн
// бодитоор дамжуулсан талбарыг л шинэчилнэ, бусдыг хэвээр үлдээнэ.
export class UpdateEnrollmentWindowDto {
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsEnum(SubjectAvailability)
  availability?: SubjectAvailability;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
