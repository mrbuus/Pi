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
import { Role } from '../generated/prisma/enums';
import { AddAssigneeDto } from './dto/add-assignee.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { WorkloadQueryDto } from './dto/workload-query.dto';
import { TasksService } from './tasks.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// Ажилтны жилийн төлөвлөгч (Taskly загварчлал) — зөвхөн ажилтны роль
// (ADMIN/TEACHER_PLUS/TEACHER)-той хэрэглэгчид хандана.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller('tasks')
export class TasksController {
  constructor(private tasks: TasksService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  create(@Body() dto: CreateTaskDto, @Req() req: AuthedRequest) {
    return this.tasks.create(dto, req.user.userId);
  }

  @Get()
  findAll(@Query() q: FindTasksQueryDto) {
    return this.tasks.findAll(q);
  }

  // 'workload' нь ':id'-с ӨМНӨ бичигдэх ёстой, эс бөгөөс id-ийн route таарч
  // "workload"-ыг task id гэж алдаатай уншина.
  @Get('workload')
  workload(@Query() q: WorkloadQueryDto) {
    return this.tasks.workload(q);
  }

  // Даалгавар оноох сонголтын жагсаалт (16 ажилтан) — 'workload'-той адил
  // ':id'-с ӨМНӨ бичигдэх ёстой.
  @Get('staff-directory')
  staffDirectory() {
    return this.tasks.staffDirectory();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: AuthedRequest,
  ) {
    return this.tasks.update(id, dto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  remove(@Param('id') id: string) {
    return this.tasks.remove(id);
  }

  @Post(':id/assignees')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  addAssignee(@Param('id') id: string, @Body() dto: AddAssigneeDto) {
    return this.tasks.addAssignee(id, dto);
  }

  @Delete(':id/assignees/:userId')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  removeAssignee(@Param('id') id: string, @Param('userId') userId: string) {
    return this.tasks.removeAssignee(id, userId);
  }
}
