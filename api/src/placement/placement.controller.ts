import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/request.interface';
import { Role } from '../generated/prisma/enums';
import {
  PhotoPlacementDto,
  PlacementSecretDto,
  ReviewPlacementDto,
  SavePlacementDto,
  StartPlacementDto,
  SubmitPlacementDto,
  UpdatePlacementTestDto,
} from './placement.dto';
import { PlacementService } from './placement.service';

// Түвшин тогтоох шалгалт. Хүүхэд нэвтрэлтгүй бодно — зочны эрх нь start-аас
// авсан нууц түлхүүр (хэш нь ӨС-д). Нийтийн маршрут тул бүгд @Throttle-тэй,
// утас, хариуны түлхүүрийг нийтийн хариунд ХЭЗЭЭ Ч оруулахгүй.
@Controller('placement')
export class PlacementController {
  constructor(private placement: PlacementService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('test')
  test() {
    return this.placement.publicTest();
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('start')
  start(@Body() dto: StartPlacementDto) {
    return this.placement.start(dto);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post(':id/resume')
  resume(@Param('id') id: string, @Body() dto: PlacementSecretDto) {
    return this.placement.resume(id, dto.secret);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Put(':id/answers')
  save(@Param('id') id: string, @Body() dto: SavePlacementDto) {
    return this.placement.save(id, dto.secret, dto.answers);
  }

  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 1 } }))
  addPhoto(@Param('id') id: string, @Body() dto: PhotoPlacementDto, @UploadedFile() file?: Express.Multer.File) {
    return this.placement.addPhoto(id, dto.secret, dto.problem, file);
  }

  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @Delete(':id/photos/:key')
  removePhoto(@Param('id') id: string, @Param('key') key: string, @Body() dto: PlacementSecretDto) {
    return this.placement.removePhoto(id, dto.secret, key);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitPlacementDto) {
    return this.placement.submit(id, dto.secret, dto.answers, dto.auto);
  }

  // ---- Удирдлага: тестийн агуулга (хариутай) ----
  // ⚠️ ':id'-аас ӨМНӨ зарлана — эс бөгөөс 'config' нь id болж баригдана
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('config')
  config() {
    return this.placement.adminTest();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Put('config')
  updateConfig(@Body() dto: UpdatePlacementTestDto, @Req() req: RequestWithUser) {
    return this.placement.updateTest(dto, req.user.userId);
  }

  // ---- Багш: бодолтыг харж түвшин тогтооно ----
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get()
  list() {
    return this.placement.list();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.placement.detail(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Patch(':id')
  review(@Param('id') id: string, @Body() dto: ReviewPlacementDto, @Req() req: RequestWithUser) {
    return this.placement.review(id, dto, req.user.userId);
  }
}
