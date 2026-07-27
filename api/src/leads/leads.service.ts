import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  // Нийтийн (нэвтрэлтгүй) маягтаас ирнэ — амжилттай хадгалагдсан ч
  // хариунд утасны дугаарыг ХЭЗЭЭ Ч буцаахгүй, controller түвшинд
  // зөвхөн id/status-ыг сонгоно.
  create(dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: dto });
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
