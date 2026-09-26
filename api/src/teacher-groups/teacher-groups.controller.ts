import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TeacherGroupsService } from './teacher-groups.service';
import { CreateTeacherGroupDto } from './dto/create-teacher-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { RegisterExternalTeacherDto } from './dto/register-external-teacher.dto';
import { VerifyExternalTeacherDto } from './dto/verify-external-teacher.dto';
import { RejectExternalTeacherDto } from './dto/reject-external-teacher.dto';

// main.ts дээр setGlobalPrefix('api') бий — энд 'api/' давхардуулбал
// зам нь /api/api/… болж, клиент 404 авна (2026-08-08-нд яг ингэж болсон).
@Controller('teacher-groups')
export class TeacherGroupsController {
  constructor(private readonly service: TeacherGroupsService) {}

  /**
   * POST /api/teacher-groups/register
   * Гадны багш бүртгүүлнэ (нэвтэрээгүй хэрэглэгч).
   */
  @Post('register')
  async registerExternalTeacher(@Body() dto: RegisterExternalTeacherDto) {
    return this.service.registerExternalTeacher(dto);
  }

  /**
   * GET /api/teacher-groups/unverified
   * Админ/TEACHER_PLUS-д: баталгаажаагүй гадны багшийн жагсаалт.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER_PLUS')
  @Get('unverified')
  async getUnverifiedTeachers() {
    return this.service.getUnverifiedTeachers();
  }

  /**
   * GET /api/teacher-groups/verified
   * Баталгаажсан гадны багшийн жагсаалт.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER_PLUS')
  @Get('verified')
  async getVerifiedTeachers() {
    return this.service.getVerifiedTeachers();
  }

  /**
   * PUT /api/teacher-groups/verify/:userId
   * Админ/TEACHER_PLUS гадны багшийг баталгаажуулна.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER_PLUS')
  @Put('verify/:userId')
  async verifyExternalTeacher(
    @Param('userId') userId: string,
    @Body() dto: VerifyExternalTeacherDto,
    @Request() req: any,
  ) {
    return this.service.verifyExternalTeacher(userId, req.user.userId, dto);
  }

  /**
   * PUT /api/teacher-groups/unverify/:userId
   * Баталгаажуулалтыг зөвхөн админ цуцална.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put('unverify/:userId')
  async unverifyExternalTeacher(@Param('userId') userId: string) {
    return this.service.unverifyExternalTeacher(userId);
  }

  /**
   * PUT /api/teacher-groups/reject/:userId
   * Хүсэлтийг шалтгаантай татгалзаж, дахин шалгах боломжтойгоор тэмдэглэнэ.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER_PLUS')
  @Put('reject/:userId')
  async rejectExternalTeacher(
    @Param('userId') userId: string,
    @Body() dto: RejectExternalTeacherDto,
  ) {
    return this.service.rejectExternalTeacher(userId, dto);
  }

  /** Татгалзсан хүсэлтийг дахин хүлээгдэж буй жагсаалтад оруулна. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER_PLUS')
  @Put('reconsider/:userId')
  async reconsiderExternalTeacher(@Param('userId') userId: string) {
    return this.service.reconsiderExternalTeacher(userId);
  }

  /**
   * POST /api/teacher-groups/my-groups
   * Гадны багш ангийн бүлэг үүсгэнэ (баталгаажсан л).
   */
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createGroup(@Body() dto: CreateTeacherGroupDto, @Request() req: any) {
    return this.service.createGroup(req.user.userId, dto);
  }

  /**
   * GET /api/teacher-groups/my-groups
   * Гадны багш өөрийн бүлгүүдийн жагсаалтыг авна.
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-groups')
  async getMyGroups(@Request() req: any) {
    return this.service.getMyGroups(req.user.userId);
  }

  /**
   * GET /api/teacher-groups/:groupId
   * Бүлгийн дэлгэрэнгүй (сурагч, шалгалтын дүн).
   */
  @UseGuards(JwtAuthGuard)
  @Get(':groupId')
  async getGroupDetails(
    @Param('groupId') groupId: string,
    @Request() req: any,
  ) {
    return this.service.getGroupDetails(groupId, req.user.userId);
  }

  /**
   * POST /api/teacher-groups/join
   * Сурагч кодоор ангид нэгдэнэ (нэвтэрсэн сурагч л).
   */
  @UseGuards(JwtAuthGuard)
  @Post('join')
  async joinGroup(@Body() dto: JoinGroupDto, @Request() req: any) {
    return this.service.joinGroup(req.user.userId, dto);
  }

  /**
   * PUT /api/teacher-groups/:groupId/archive
   * Бүлгийг архив хийнэ.
   */
  @UseGuards(JwtAuthGuard)
  @Put(':groupId/archive')
  async archiveGroup(@Param('groupId') groupId: string, @Request() req: any) {
    return this.service.archiveGroup(groupId, req.user.userId);
  }

  /**
   * DELETE /api/teacher-groups/:groupId/students/:studentId
   * Сурагчийг бүлгээс хасна.
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':groupId/students/:studentId')
  async removeStudentFromGroup(
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
    @Request() req: any,
  ) {
    return this.service.removeStudentFromGroup(
      groupId,
      studentId,
      req.user.userId,
    );
  }
}
