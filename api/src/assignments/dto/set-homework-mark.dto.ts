import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { HomeworkMarkStatus } from '../../generated/prisma/enums';

// Багшийн өдөр тутмын гэрийн даалгаврын тэмдэглэгээ (PATCH). Талбар бүр
// сонголттой — багш зөвхөн өнгийг л, эсвэл зөвхөн тайлбарыг л дангаар нь
// хадгалж болно (frontend хоёрыг тусад нь дуудна: өнгө шууд, тайлбар
// debounce-той). @IsOptional нь null-ийг мөн зөвшөөрдөг тул "тэмдэглэгээг
// цэвэрлэх" (null болгох) хүсэлт бас дэмжигдэнэ.
export class SetHomeworkMarkDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsEnum(HomeworkMarkStatus)
  status?: HomeworkMarkStatus | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Тайлбар 2000 тэмдэгтээс ихгүй байх ёстой' })
  comment?: string | null;
}
