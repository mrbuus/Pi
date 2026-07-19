import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVideoDto } from './dto/create-video.dto';

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateVideoDto) {
    return this.prisma.video.create({
      data: {
        title: dto.title,
        chapterId: dto.chapterId,
        s3Key: dto.url,
        duration: dto.duration,
      },
    });
  }

  // Сэдвийн (chapter) бичлэгүүд — MVP: эрх (pass) шалгалтгүй, зөвхөн нэвтэрсэн
  // байхыг шаардана (бодлогын Pass-gating-тэй адилтгах нь дараагийн ээлж)
  listByChapter(chapterId: string) {
    return this.prisma.video.findMany({
      where: { chapterId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Ном тус бүрийн бичлэгтэй бүлэг сэдвүүд — "Онлайн хичээл" хуудсанд ном/сэдэв
  // сонгох мод харуулахад хэрэглэгдэнэ
  async listChaptersWithVideos() {
    const chapters = await this.prisma.chapter.findMany({
      where: { videos: { some: {} } },
      select: {
        id: true,
        title: true,
        book: { select: { code: true, title: true } },
        _count: { select: { videos: true } },
      },
      orderBy: [{ book: { code: 'asc' } }, { order: 'asc' }],
    });
    return chapters;
  }

  async remove(id: string) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) throw new NotFoundException('Бичлэг олдсонгүй');
    await this.prisma.video.delete({ where: { id } });
    return { removed: true };
  }
}
