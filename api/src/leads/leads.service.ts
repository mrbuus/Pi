import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  LeadStatus,
  LeadSubject,
  Subject,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

// Хуучин Lead.subject (LeadSubject) багана SAT утга огт мэдэхгүй (Content
// модулийн Subject enum-тай өөр учир — schema.prisma-ийн тайлбарыг үз). Шинэ
// subjects[]-ээс ганц MATH эсвэл ганц SOCIAL_STUDIES бол шууд тэр утгыг нь,
// бусад бүх тохиолдолд (олон хичээл, эсвэл SAT ганцаараа ч гэсэн) BOTH-руу
// буулгана — энэ бол LeadSubject-ийн хамгийн аюулгүй fallback.
function toLegacyLeadSubject(subjects: Subject[]): LeadSubject {
  if (subjects.length === 1) {
    if (subjects[0] === Subject.MATH) return LeadSubject.MATH;
    if (subjects[0] === Subject.SOCIAL_STUDIES) return LeadSubject.SOCIAL_STUDIES;
  }
  return LeadSubject.BOTH;
}

// Алдааны мессежинд хэрэглэх хичээлийн Монгол нэр (харьяалахын тийн ялгал).
const SUBJECT_GENITIVE: Record<Subject, string> = {
  [Subject.MATH]: 'Математикийн',
  [Subject.SOCIAL_STUDIES]: 'Нийгэм судлалын',
  [Subject.SAT]: 'SAT-ын',
};

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  // Нийтийн (нэвтрэлтгүй) маягтаас ирнэ — амжилттай хадгалагдсан ч
  // хариунд утасны дугаарыг ХЭЗЭЭ Ч буцаахгүй, controller түвшинд
  // зөвхөн id/status-ыг сонгоно.
  async create(dto: CreateLeadDto) {
    // 🚨 СЕРВЕРИЙН ХААЛТ — жинхэнэ хаалт эндээс: UI дээрх шалгалт зөвхөн
    // туслах, хэрэглэгч API-г шууд дуудвал ч энд заавал зогсоно. Сонгосон
    // хичээл БҮРИЙН элсэлтийн цонх OPEN эсэхийг шалгана.
    const windows = await this.prisma.enrollmentWindow.findMany({
      where: { subject: { in: dto.subjects } },
    });
    const windowBySubject = new Map(windows.map((w) => [w.subject, w]));
    for (const subject of dto.subjects) {
      const window = windowBySubject.get(subject);
      if (!window || window.status !== EnrollmentStatus.OPEN) {
        const label = SUBJECT_GENITIVE[subject];
        const reason =
          window?.status === EnrollmentStatus.COMING_SOON
            ? 'удахгүй нээгдэнэ'
            : 'одоогоор дууссан байна';
        throw new BadRequestException(`${label} элсэлт ${reason}`);
      }
    }

    return this.prisma.lead.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        grade: dto.grade,
        subjects: dto.subjects,
        // Deprecated багана — хуучин код/тайланг эвдэхгүйн тулд хэвээр бөглөнө.
        subject: toLegacyLeadSubject(dto.subjects),
      },
    });
  }

  // Ажилтны удирдлагын самбар — шинэ лийд эхэнд гарна.
  findAll() {
    return this.prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updateStatus(id: string, status: LeadStatus) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Лийд олдсонгүй');
    return this.prisma.lead.update({ where: { id }, data: { status } });
  }
}
