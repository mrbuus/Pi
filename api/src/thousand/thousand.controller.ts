import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { AssignThousandDto, SetThousandReviewDto, SetYoutubeDto } from './thousand.dto';
import { ThousandService } from './thousand.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

const STAFF = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER] as const;
const CONTENT = [Role.ADMIN, Role.TEACHER_PLUS] as const;

// «1000 бодлогын шалгалт» — шалгалт өгөх нь /tests/:id/start|session|submit
// (одоо байгаа хөдөлгүүр) хэвээр; энд зөвхөн жагсаалт, ангийн эргэн харалтын
// хаалт, YouTube холбоос.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('thousand')
export class ThousandController {
  constructor(private readonly thousand: ThousandService) {}

  @Roles(Role.STUDENT, Role.BUYER, ...STAFF)
  @Get('tests')
  list(@Req() req: AuthedRequest) {
    return this.thousand.list(req.user.userId, req.user.role);
  }

  @Roles(Role.STUDENT, Role.BUYER)
  @Get('tests/:testId/review')
  review(@Param('testId') testId: string, @Req() req: AuthedRequest) {
    return this.thousand.studentReview(testId, req.user.userId);
  }

  @Roles(...STAFF)
  @Get('tests/:testId/staff')
  staffTest(@Param('testId') testId: string, @Req() req: AuthedRequest) {
    return this.thousand.staffTest(testId, req.user.userId);
  }

  @Roles(...STAFF)
  @Get('classrooms/:classroomId')
  classTests(@Param('classroomId') classroomId: string, @Req() req: AuthedRequest) {
    return this.thousand.classTests(classroomId, req.user.userId);
  }

  @Roles(...STAFF)
  @Post('classrooms/:classroomId/tests/:testId')
  assign(
    @Param('classroomId') classroomId: string,
    @Param('testId') testId: string,
    @Body() dto: AssignThousandDto,
    @Req() req: AuthedRequest,
  ) {
    return this.thousand.assign(classroomId, testId, req.user.userId, dto?.reviewAutoAt);
  }

  @Roles(...STAFF)
  @Delete('classrooms/:classroomId/tests/:testId')
  unassign(
    @Param('classroomId') classroomId: string,
    @Param('testId') testId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.thousand.unassign(classroomId, testId, req.user.userId);
  }

  @Roles(...STAFF)
  @Patch('classrooms/:classroomId/tests/:testId/review')
  setReview(
    @Param('classroomId') classroomId: string,
    @Param('testId') testId: string,
    @Body() dto: SetThousandReviewDto,
    @Req() req: AuthedRequest,
  ) {
    return this.thousand.setReview(classroomId, testId, req.user.userId, dto);
  }

  @Roles(...CONTENT)
  @Patch('problems/:problemId/youtube')
  setYoutube(
    @Param('problemId') problemId: string,
    @Body() dto: SetYoutubeDto,
    @Req() req: AuthedRequest,
  ) {
    return this.thousand.setYoutube(
      problemId,
      dto.url ?? null,
      req.user.userId,
      dto.expectedVersion,
    );
  }

  @Roles(...CONTENT)
  @Get('youtube/export')
  exportYoutube(@Req() req: AuthedRequest) {
    return this.thousand.exportYoutube(req.user.userId);
  }

  @Roles(...CONTENT)
  @Post('youtube/import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importYoutube(@UploadedFile() file: Express.Multer.File | undefined, @Req() req: AuthedRequest) {
    if (!file?.buffer) throw new BadRequestException('Excel файл сонгоно уу.');
    return this.thousand.importYoutube(file.buffer, req.user.userId);
  }
}
