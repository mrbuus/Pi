import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ClassroomType, Subject } from '../../generated/prisma/enums';
import { CreateClassroomDto } from './create-classroom.dto';
import { UpdateClassroomDto } from './update-classroom.dto';
import { SubjectChapterDto } from '../../content/dto/subject-chapter.dto';

// Ангийн хичээл (эзэн 2026-10-18): заавал биш, Subject enum, null = MATH руу буцаах
describe('Classroom subject DTO validation', () => {
  it('create: subject заавал биш, зөвхөн Subject утга', async () => {
    const base = { name: 'Анги', type: ClassroomType.IN_PERSON };
    expect(
      await validate(plainToInstance(CreateClassroomDto, base)),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateClassroomDto, {
          ...base,
          subject: Subject.SOCIAL_STUDIES,
        }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateClassroomDto, { ...base, subject: 'HISTORY' }),
      ),
    ).not.toHaveLength(0);
  });

  it('update: null (MATH руу буцаах) болон enum утга хүлээн авна', async () => {
    expect(
      await validate(plainToInstance(UpdateClassroomDto, { subject: null })),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(UpdateClassroomDto, {
          subject: Subject.SOCIAL_STUDIES,
        }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(UpdateClassroomDto, { subject: 'social' }),
      ),
    ).not.toHaveLength(0);
  });

  it('POST /chapters/for-subject: subject enum + хоосон биш нэр', async () => {
    expect(
      await validate(
        plainToInstance(SubjectChapterDto, {
          subject: Subject.SOCIAL_STUDIES,
          title: 'Нийгмийн ухаан 1',
        }),
      ),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(SubjectChapterDto, { subject: 'X', title: '' }),
      ),
    ).toHaveLength(2);
  });
});
