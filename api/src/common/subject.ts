import { BadRequestException } from '@nestjs/common';
import { Subject } from '../generated/prisma/enums';

// Query параметрийн ?subject= утгыг Subject enum-тай нь шалгана. Заавал биш —
// өгөгдөөгүй бол undefined буцааж өнөөгийн (бүх хичээл) байдлыг хадгална.
export function parseSubjectQuery(subject?: string): Subject | undefined {
  if (subject === undefined || subject === '') return undefined;
  if (!Object.values(Subject).includes(subject as Subject)) {
    throw new BadRequestException(
      `subject параметр буруу байна: "${subject}"`,
    );
  }
  return subject as Subject;
}
