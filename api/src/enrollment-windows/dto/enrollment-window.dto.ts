import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  EnrollmentStatus,
  SubjectAvailability,
} from '../../generated/prisma/enums';

// PATCH /enrollment-windows/:subject — талбар бүр сонголтоор ирнэ, зөвхөн
// бодитоор дамжуулсан талбарыг л шинэчилнэ, бусдыг хэвээр үлдээнэ.
export class UpdateEnrollmentWindowDto {
  @ApiPropertyOptional({ enum: EnrollmentStatus })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @ApiPropertyOptional({ enum: SubjectAvailability })
  @IsOptional()
  @IsEnum(SubjectAvailability)
  availability?: SubjectAvailability;

  @ApiPropertyOptional({ type: String, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
