import { todayUB } from '../common/date';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Тест ангийн хуваарьт (өнөөдөр/ирээдүйд) ямар ч ангид бодогдох, эсвэл ирээдүйд оноогдох уу —
 * тэгвэл зөв хариуг ХЭЗЭЭ Ч нээхгүй (хариу бусад ангид дамжих эрсдэл; аюулгүй байдлын шалгалт).
 * Гэрийн даалгаврын эргэн харалт ба хугацаатай давталт (`mistakes/problem-review.service.ts`) хоёулаа
 * ЭНЭ функцийг хэрэглэнэ — дүрмийг хоёр газар бүү давхарла.
 */
export async function reservedAnywhere(
  prisma: Pick<PrismaService, 'classTestSession' | 'lessonTopic' | 'testAccess'>,
  testId: string,
): Promise<boolean> {
  const today = todayUB();
  const [session, topic, access] = await Promise.all([
    prisma.classTestSession.findFirst({
      where: { testId, date: { gte: today } },
      select: { id: true },
    }),
    prisma.lessonTopic.findFirst({
      // Анхны огноо 14 хоногийн өмнөөс — хичээл ирээдүй рүү ЗӨӨГДСӨН (ScheduleException.newDate)
      // байж болно; зөөлтийг тусад нь тайлахгүй, хамгаалах талаар барина
      where: {
        testIds: { has: testId },
        date: { gte: new Date(today.getTime() - 14 * 86_400_000) },
      },
      select: { id: true },
    }),
    prisma.testAccess.findFirst({
      where: { testId, assignedAt: { gt: new Date() } },
      select: { testId: true },
    }),
  ]);
  return !!(session || topic || access);
}
