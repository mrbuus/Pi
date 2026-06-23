import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MistakeType, Role, TagType } from '../generated/prisma/enums';
import { ClassificationService } from './classification.service';

class CategoryDto {
  @IsEnum(TagType)
  type: TagType;

  @IsString()
  @IsNotEmpty()
  name: string;
}

class RenameDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

class ChoiceDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsOptional()
  @IsEnum(MistakeType)
  mistakeType?: MistakeType;

  @IsOptional()
  @IsString()
  mistakeNote?: string;
}

class SetChoicesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  choices: ChoiceDto[];
}

class SetTagsDto {
  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller('classification')
export class ClassificationController {
  constructor(private classification: ClassificationService) {}

  // Ангиллын жагсаалт (?type=SOLUTION_TYPE гэх мэт)
  @Get('categories')
  listCategories(@Query('type') type?: TagType) {
    return this.classification.listCategories(type);
  }

  @Post('categories')
  createCategory(@Body() dto: CategoryDto) {
    return this.classification.createCategory(dto.type, dto.name);
  }

  // Нэр солих → бүх холбоотой бодлого автоматаар шинэчлэгдэнэ
  @Patch('categories/:id')
  renameCategory(@Param('id') id: string, @Body() dto: RenameDto) {
    return this.classification.renameCategory(id, dto.name);
  }

  @Get('problems/:id')
  getProblem(@Param('id') id: string) {
    return this.classification.getProblemForEdit(id);
  }

  @Put('problems/:id/choices')
  setChoices(
    @Param('id') id: string,
    @Body() dto: SetChoicesDto,
    @Req() req: AuthedRequest,
  ) {
    return this.classification.setChoices(id, dto.choices, req.user.role);
  }

  @Put('problems/:id/tags')
  setTags(
    @Param('id') id: string,
    @Body() dto: SetTagsDto,
    @Req() req: AuthedRequest,
  ) {
    return this.classification.setProblemTags(id, dto.tagIds, req.user.role);
  }
}
