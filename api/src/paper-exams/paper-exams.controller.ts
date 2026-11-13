import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/request.interface';
import { Role } from '../generated/prisma/enums';
import {
  CreatePaperExamDto,
  ImportQueryDto,
  LinkSheetDto,
  SavePaperItemsDto,
  StudentSearchDto,
  UpdatePaperExamDto,
} from './paper-exams.dto';
import { PaperExamsService, type Actor } from './paper-exams.service';

const STAFF = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER] as const;
const MANAGE = [Role.ADMIN, Role.TEACHER_PLUS] as const;

/** multer нь кирилл файлын нэрийг latin1 байдлаар өгдөг — аль хэдийн UTF-8 бол хөндөхгүй. */
function fileNameOf(raw: string): string {
  if ([...raw].some((ch) => ch.charCodeAt(0) > 0xff)) return raw;
  const decoded = Buffer.from(raw, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? raw : decoded;
}

const actorOf = (req: RequestWithUser): Actor => ({
  userId: req.user.userId,
  role: req.user.role,
});

/**
 * Цаасан шалгалт (OMR машин / Excel) — docs/PLAN-OMR.md.
 * Багш+/Админ: шалгалт, түлхүүр, агуулга, импорт. Багш: өөрийн ангийн хүснэгт.
 * Сурагч: өөрийн дүн + төвийн жагсаалт (нэр, баг, нийт оноо).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('paper-exams')
export class PaperExamsController {
  constructor(private readonly paper: PaperExamsService) {}

  // ---- Сурагч (id нь токеноос — бусдын дүнг URL-аар үзэхгүй) ----
  @Roles(Role.STUDENT)
  @Get('my')
  my(@Req() req: RequestWithUser) {
    return this.paper.my(req.user.userId);
  }

  @Roles(Role.STUDENT)
  @Get('my/:id')
  myDetail(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.paper.myDetail(id, req.user.userId);
  }

  // ---- Ажилтан ----
  @Roles(...STAFF)
  @Get()
  list(@Req() req: RequestWithUser) {
    return this.paper.list(actorOf(req));
  }

  @Roles(...MANAGE)
  @Get('students/search')
  searchStudents(@Query() query: StudentSearchDto) {
    return this.paper.searchStudents(query.q);
  }

  @Roles(...MANAGE)
  @Post()
  create(@Body() dto: CreatePaperExamDto, @Req() req: RequestWithUser) {
    return this.paper.create(dto, actorOf(req));
  }

  @Roles(...STAFF)
  @Get(':id')
  board(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.paper.board(id, actorOf(req));
  }

  @Roles(...MANAGE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaperExamDto,
    @Req() req: RequestWithUser,
  ) {
    return this.paper.update(id, dto, actorOf(req));
  }

  @Roles(...MANAGE)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.paper.remove(id, actorOf(req));
  }

  @Roles(...MANAGE)
  @Put(':id/items')
  saveItems(
    @Param('id') id: string,
    @Body() dto: SavePaperItemsDto,
    @Req() req: RequestWithUser,
  ) {
    return this.paper.saveItems(id, dto, actorOf(req));
  }

  /** ?confirm=1 — хадгална; үгүй бол зөвхөн урьдчилан харна. ?replace=0 — өмнөх дүнг солихгүй. */
  @Roles(...MANAGE)
  @Post(':id/import')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) =>
        file.originalname.toLowerCase().endsWith('.xlsx')
          ? cb(null, true)
          : cb(
              new BadRequestException(
                '.xlsx Excel файл оруулна уу (хуучин .xls бол Excel-ээр нээгээд .xlsx болгож хадгална)',
              ),
              false,
            ),
    }),
  )
  importFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query() query: ImportQueryDto,
    @Req() req: RequestWithUser,
  ) {
    if (!file) throw new BadRequestException('Файл сонгоно уу');
    return this.paper.importFile(
      id,
      file.buffer,
      fileNameOf(file.originalname),
      { confirm: query.confirm === '1', replace: query.replace !== '0' },
      actorOf(req),
    );
  }

  @Roles(...MANAGE)
  @Get(':id/imports')
  imports(@Param('id') id: string) {
    return this.paper.imports(id);
  }

  @Roles(...MANAGE)
  @Post('imports/:importId/revert')
  @HttpCode(200)
  revert(@Param('importId') importId: string, @Req() req: RequestWithUser) {
    return this.paper.revertImport(importId, actorOf(req));
  }

  @Roles(...MANAGE)
  @Patch('sheets/:sheetId')
  link(
    @Param('sheetId') sheetId: string,
    @Body() dto: LinkSheetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.paper.linkSheet(sheetId, dto.studentId ?? null, actorOf(req));
  }
}
