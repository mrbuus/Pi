import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/request.interface';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { DraftFileGuard } from './draft-file.guard';
import {
  BulkDraftBlocksDto,
  CheckDraftAnswersDto,
  CreateDraftBlockDto,
  CreateDraftSetDto,
  PublishDraftSetDto,
  ReorderDraftBlocksDto,
  UpdateDraftBlockDto,
  UpdateDraftSetDto,
} from './internal-drafts.dto';
import { readStoredBytes } from '../storage/file-store';
import { InternalDraftsService } from './internal-drafts.service';
import { RequireCapability } from '../staff-capabilities/capability.guard';

/**
 * «Дотоод» — ажилтны бодлого/тестийн ноорог. ЗӨВХӨН Багш+ ба Админ: ноорогт
 * нийтлээгүй хариу, шалгалтын агуулга байдаг тул энгийн Багш, сурагч, эцэг эх
 * ХЭЗЭЭ Ч хандахгүй (RolesGuard + сервис ӨС-ийн эрхийг дахин шалгана).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
@Controller('internal-drafts')
export class InternalDraftsController {
  constructor(private readonly drafts: InternalDraftsService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('sets')
  @RequireCapability('content.manage')
  list(
    @Req() req: RequestWithUser,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.drafts.listSets(req.user.userId, q, status);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('sets')
  @RequireCapability('content.manage')
  create(@Body() dto: CreateDraftSetDto, @Req() req: RequestWithUser) {
    return this.drafts.createSet(dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('sets/:id')
  @RequireCapability('content.manage')
  get(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.drafts.getSet(id, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('sets/:id')
  @RequireCapability('content.manage')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDraftSetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.drafts.updateSet(id, dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('sets/:id')
  @RequireCapability('content.manage')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.drafts.deleteSet(id, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('sets/:id/blocks')
  @RequireCapability('content.manage')
  addBlock(
    @Param('id') id: string,
    @Body() dto: CreateDraftBlockDto,
    @Req() req: RequestWithUser,
  ) {
    return this.drafts.addBlock(id, dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('sets/:id/blocks/bulk')
  @RequireCapability('content.manage')
  addBlocks(
    @Param('id') id: string,
    @Body() dto: BulkDraftBlocksDto,
    @Req() req: RequestWithUser,
  ) {
    return this.drafts.addBlocks(id, dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put('sets/:id/order')
  @RequireCapability('content.manage')
  reorder(
    @Param('id') id: string,
    @Body() dto: ReorderDraftBlocksDto,
    @Req() req: RequestWithUser,
  ) {
    return this.drafts.reorder(id, dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('sets/:id/check')
  @HttpCode(200)
  @RequireCapability('content.manage')
  check(
    @Param('id') id: string,
    @Body() dto: CheckDraftAnswersDto,
    @Req() req: RequestWithUser,
  ) {
    return this.drafts.check(id, dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('sets/:id/publish')
  @RequireCapability('content.manage')
  publish(
    @Param('id') id: string,
    @Body() dto: PublishDraftSetDto,
    @Req() req: RequestWithUser,
  ) {
    return this.drafts.publish(id, dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('blocks/:blockId')
  @RequireCapability('content.manage')
  updateBlock(
    @Param('blockId') blockId: string,
    @Body() dto: UpdateDraftBlockDto,
    @Req() req: RequestWithUser,
  ) {
    return this.drafts.updateBlock(blockId, dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('blocks/:blockId/duplicate')
  @RequireCapability('content.manage')
  duplicate(@Param('blockId') blockId: string, @Req() req: RequestWithUser) {
    return this.drafts.duplicateBlock(blockId, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('blocks/:blockId')
  @RequireCapability('content.manage')
  removeBlock(@Param('blockId') blockId: string, @Req() req: RequestWithUser) {
    return this.drafts.deleteBlock(blockId, req.user.userId);
  }
}

/**
 * Ноорогийн зураг (<img src>) — ?token= хүлээн авах тул JwtAuthGuard-гүй,
 * DraftFileGuard өөрөө токен, эрх (Багш+/Админ), холбоосыг шалгана.
 */
@Controller('internal-drafts/files')
export class InternalDraftFilesController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(DraftFileGuard)
  @Get(':key')
  async serve(@Param('key') key: string, @Res() res: Response) {
    const file = await readStoredBytes(this.prisma, key);
    if (!file || !file.mime.startsWith('image/'))
      throw new NotFoundException('Файл олдсонгүй');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Type', file.mime);
    res.end(Buffer.from(file.bytes));
  }
}
