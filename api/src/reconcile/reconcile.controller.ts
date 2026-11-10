import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FinanceCapabilityGuard } from '../payments/finance-capability.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReconcileService } from './reconcile.service';
import { AllocateDto, ListRowsQueryDto, SheetThroughDto, StudentSearchQueryDto } from './reconcile.dto';

// JwtStrategy.validate() нь { userId, role } буцаадаг — sub БИШ
interface UserPayload {
  userId: string;
  role: string;
}

/** Банкны хуулга → хүүхдийн төлбөр. Мөнгөтэй ажил тул Админ, Багш+ (санхүүгийн эрхтэй). */
@Controller('reconcile')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
@Roles('ADMIN', 'TEACHER_PLUS')
export class ReconcileController {
  constructor(private readonly reconcile: ReconcileService) {}

  /** POST /reconcile/import — Хаан банкны хуулга (.xlsx) */
  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        file.originalname.toLowerCase().endsWith('.xlsx')
          ? cb(null, true)
          : cb(new BadRequestException('Хаан банкнаас татсан .xlsx хуулга оруулна уу'), false),
    }),
  )
  importFile(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: UserPayload) {
    if (!file) throw new BadRequestException('Файл сонгоно уу');
    return this.reconcile.importStatement(file.buffer, { id: user.userId, role: user.role });
  }

  /** GET /reconcile/overview — «бүрэн шийдсэн өдөр», жагсаалт бүрийн тоо */
  @Get('overview')
  overview() {
    return this.reconcile.overview();
  }

  /** GET /reconcile/rows?lane=manual|tuition|other|expense&q=&limit=&offset= */
  @Get('rows')
  rows(@Query() query: ListRowsQueryDto) {
    return this.reconcile.listRows(query);
  }

  /** GET /reconcile/students?q= — гараар оноохдоо хүүхэд хайх (нэр, утас) */
  @Get('students')
  students(@Query() query: StudentSearchQueryDto) {
    return this.reconcile.searchStudents(query.q);
  }

  /** GET /reconcile/students/:id — «⋯» дэлгэрэнгүй: утас, эцэг эх, хуулгаас оноосон гүйлгээ */
  @Get('students/:id')
  student(@Param('id') id: string) {
    return this.reconcile.studentDetail(id);
  }

  /** POST /reconcile/rows/:id/allocate — нэг гүйлгээг хүүхэд/зориулалтад хуваарилах */
  @Post('rows/:id/allocate')
  @HttpCode(200)
  allocate(@Param('id') id: string, @Body() dto: AllocateDto, @CurrentUser() user: UserPayload) {
    return this.reconcile.allocate(id, dto, { id: user.userId, role: user.role });
  }

  /** POST /reconcile/sheet-through — «энэ өдрийг хүртэл ажилтан шийтэд хөтөлсөн»: тулгагдаагүйг «Шийдэх»-ээс нууна */
  @Post('sheet-through')
  @HttpCode(200)
  sheetThrough(@Body() dto: SheetThroughDto, @CurrentUser() user: UserPayload) {
    return this.reconcile.markSheetThrough(dto.through, { id: user.userId, role: user.role });
  }

  /** POST /reconcile/rows/:id/undo — хуваарилалтыг буцаах (устгахгүй, төлбөр REVERSED) */
  @Post('rows/:id/undo')
  @HttpCode(200)
  undo(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.reconcile.undo(id, { id: user.userId, role: user.role });
  }
}
