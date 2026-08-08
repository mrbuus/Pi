import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SmsBulkDto } from './dto/sms-bulk.dto';
import { Role } from '../generated/prisma/enums';
import { SmsManagementService } from './sms-management.service';

/**
 * SMS удирдлагын HTTP гадаргуу.
 *
 * ⚠️ ЯАГААД ЭНЭ ФАЙЛ ХОЖУУ ҮҮССЭН ВЭ (2026-08-08):
 * Хоёр агент нэг зэрэг `notifications/` дотор ажилласны улмаас нэг нь бодит
 * сервис (sms-management.service.ts), нөгөө нь `sms.service.ts` дээр ХООСОН
 * stub-ууд бичиж, controller нь бүрмөсөн алдагдсан байв. Өөрөөр хэлбэл вэб
 * дэлгэц БАЙХГҮЙ endpoint рүү хандаж байсан. Энэ файл тэр гинжийг холбоно.
 *
 * ЭРХ: SMS нь ӨРТӨГТЭЙ бөгөөд БУЦААХ БОЛОМЖГҮЙ. Санамсаргүй 500 хүнд илгээвэл
 * мөнгө шууд алдагдана. Тиймээс бичих бүх үйлдэл зөвхөн ADMIN. Ажилтан
 * (TEACHER_PLUS) зөвхөн ТҮҮХИЙГ харна — юу явсныг мэдэх нь ажилдаа хэрэгтэй.
 */
@Controller('sms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SmsController {
  constructor(private readonly sms: SmsManagementService) {}

  /** Нийлүүлэгч тохируулагдсан эсэх, энэ сарын хэрэглээ */
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('status')
  status(@Req() req: { user: { userId: string } }) {
    return this.sms.getStatus(req.user.userId);
  }

  /** Нэг дугаар руу */
  @Roles(Role.ADMIN)
  @Post('send')
  send(
    @Body() body: { phone: string; text: string; kind?: string },
    @Req() req: { user: { userId: string } },
  ) {
    return this.sms.sendSms(body, req.user.userId);
  }

  /**
   * Бөөн илгээлтийн ТООЦОО — хэдэн хүн, хэдэн SMS хэсэг, ойролцоо өртөг.
   * ⚠️ Илгээхээс ӨМНӨ энэ дуудагдана. Кирилл бичвэр 70 тэмдэгт/хэсэг тул
   * латинаас 2 дахин үнэтэй — хэрэглэгч үүнийг УРЬДЧИЛЖ мэдэх ёстой.
   */
  @Roles(Role.ADMIN)
  @Post('bulk/estimate')
  estimate(@Body() body: SmsBulkDto) {
    return this.sms.estimateBulkSms(body);
  }

  /** Бөөн илгээлтийн ноорог үүсгэнэ (хараахан ИЛГЭЭХГҮЙ) */
  @Roles(Role.ADMIN)
  @Post('bulk')
  createBulk(
    @Body() body: SmsBulkDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.sms.createBulkSmsDraft(body, req.user.userId);
  }

  /** Ноорогийг илгээж эхлүүлнэ — HTTP хүсэлтийг блоклохгүй */
  @Roles(Role.ADMIN)
  @Post('bulk/:id/start')
  startBulk(@Param('id') id: string) {
    return this.sms.startBulkSmsSending(id);
  }

  /** Илгээсэн мессежийн түүх */
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('messages')
  messages(
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('phone') phone?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.sms.getMessages({
      status,
      kind,
      phone,
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
      skip: skip ? Number(skip) : undefined,
      // Дээд хязгаар 200 — клиентээс ирсэн тоонд найдахгүй (санах ой хамгаална)
      take: Math.min(take ? Number(take) : 50, 200),
    });
  }

  /** Бөөн илгээлтүүд */
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('batches')
  batches(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.sms.getBatches({
      skip: skip ? Number(skip) : undefined,
      take: Math.min(take ? Number(take) : 20, 100),
    });
  }

  /** Амжилтгүй болсныг дахин илгээх */
  @Roles(Role.ADMIN)
  @Post('messages/:id/retry')
  retry(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.sms.retryMessage(id, req.user.userId);
  }

  // ---- Загварууд ----

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('templates')
  templates() {
    return this.sms.getTemplates();
  }

  @Roles(Role.ADMIN)
  @Post('templates')
  createTemplate(
    @Body() body: { name: string; body: string; kind: string },
    @Req() req: { user: { userId: string } },
  ) {
    return this.sms.createTemplate(body.name, body.body, body.kind, req.user.userId);
  }

  @Roles(Role.ADMIN)
  @Patch('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @Body() body: { name?: string; body?: string },
  ) {
    return this.sms.updateTemplate(id, body);
  }

  @Roles(Role.ADMIN)
  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.sms.deleteTemplate(id);
  }
}
