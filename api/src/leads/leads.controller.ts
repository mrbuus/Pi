import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsService } from './leads.service';

// Бизнесийн хамгийн өндөр ROI-той өөрчлөлт: төв 7,900 Facebook followers-тэй
// ч бүх элсэлтийг гараар Messenger DM-ээр боловсруулдаг байсан — шөнө/
// амралтын өдөр ирсэн сонирхогч алдагдаж, юу ч хэмжигдэхгүй байв. Энэ
// маягт нийтэд нээлттэй тул JwtAuthGuard-гүй, харин unauthenticated
// эх сурвалж учир @Throttle-оор spam-аас хамгаална.
@Controller('leads')
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  async create(@Body() dto: CreateLeadDto) {
    const lead = await this.leads.create(dto);
    // Утасны дугаарыг нийтийн хариунд ХЭЗЭЭ Ч оруулахгүй.
    return { id: lead.id, status: lead.status };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get()
  findAll() {
    return this.leads.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leads.updateStatus(id, dto.status);
  }
}
