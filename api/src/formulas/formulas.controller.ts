import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { FormulaDto } from './dto/formula.dto';
import { FormulaQueryDto, FormulaStudentQueryDto } from './dto/formula-query.dto';
import { FormulasService } from './formulas.service';

class PatchFormulaDto extends PartialType(FormulaDto) {}
interface AuthedRequest { user: { userId: string; role: Role } }

@ApiTags('formulas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('formulas')
export class FormulasController {
  constructor(private readonly formulas: FormulasService) {}

  @Get('sections') @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER)
  @ApiOperation({ summary: 'Томьёоны бүлгүүд' }) sections() { return this.formulas.sections(); }

  @Get('my') @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER)
  @ApiOperation({ summary: 'Сурагчийн туулсан тестийн томьёо' })
  my(@Query() query: FormulaStudentQueryDto, @Req() req: AuthedRequest) { return this.formulas.my(req.user, query.studentId); }

  @Get() @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER)
  @ApiOperation({ summary: 'Томьёоны сан' }) list(@Query() query: FormulaQueryDto) { return this.formulas.list(query); }

  // T10 adds review routes here, before the slug route to prevent route capture.
  @Get(':slug') @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER)
  @ApiOperation({ summary: 'Томьёоны дэлгэрэнгүй' }) bySlug(@Param('slug') slug: string) { return this.formulas.bySlug(slug); }

  @Post() @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @ApiOperation({ summary: 'Томьёо үүсгэх' }) create(@Body() dto: FormulaDto) { return this.formulas.create(dto); }

  @Patch(':slug') @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @ApiOperation({ summary: 'Томьёо засах' }) update(@Param('slug') slug: string, @Body() dto: PatchFormulaDto) { return this.formulas.update(slug, dto); }
}
