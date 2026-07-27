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
import { Role, StudentNoteType } from '../generated/prisma/enums';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';
import { NotesService } from './notes.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class NotesController {
  constructor(private notes: NotesService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('students/:id/notes')
  create(
    @Param('id') studentId: string,
    @Body() dto: CreateNoteDto,
    @Req() req: AuthedRequest,
  ) {
    return this.notes.create(studentId, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('students/:id/notes')
  list(
    @Param('id') studentId: string,
    @Req() req: AuthedRequest,
    @Query('type') type?: StudentNoteType,
  ) {
    return this.notes.list(studentId, type, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Patch('notes/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @Req() req: AuthedRequest,
  ) {
    return this.notes.update(id, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Delete('notes/:id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.notes.remove(id, req.user.userId, req.user.role);
  }
}
