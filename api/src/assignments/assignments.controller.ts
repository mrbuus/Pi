import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReviewDto } from './dto/review.dto';
import { SubmitDto } from './dto/submit.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssignmentsController {
  constructor(private assignments: AssignmentsService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('classrooms/:id/assignments')
  create(
    @Param('id') classroomId: string,
    @Body() dto: CreateAssignmentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.assignments.create(
      classroomId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/assignments')
  listForClass(@Param('id') classroomId: string, @Req() req: AuthedRequest) {
    return this.assignments.listForClass(
      classroomId,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.STUDENT)
  @Get('assignments/my')
  my(@Req() req: AuthedRequest) {
    return this.assignments.myAssignments(req.user.userId);
  }

  @Roles(Role.STUDENT)
  @Post('assignments/:id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitDto,
    @Req() req: AuthedRequest,
  ) {
    return this.assignments.submit(id, req.user.userId, dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('assignments/:id/review')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @Req() req: AuthedRequest,
  ) {
    return this.assignments.review(id, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('assignments/:id/submissions')
  roster(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.assignments.submissionsRoster(
      id,
      req.user.userId,
      req.user.role,
    );
  }
}
