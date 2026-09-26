import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional } from 'class-validator';

// Session-ийн autosave БА эцсийн илгээлт хоёул ижил хэлбэртэй: клиент юу
// өөрчлөгдснөө л явуулна, сервер session-ий draft дээр нэгтгэнэ. Ингэснээр
// «эцсийн хариулт тооцогдоно» (last-answer-wins) зарчим автоматаар биелнэ.
export class SaveSessionDto {
  // { problemId: displayIdx(number) | үсэг | утга } — горимоос хамаарна
  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  // { problemId: SelfState } — өөрийн тэмдэглэгээ (SPEC §9.1)
  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  @IsOptional()
  @IsObject()
  selfStates?: Record<string, string>;

  // { problemId: сек } — бодлого бүр дээр зарцуулсан бодит хугацаа
  @ApiPropertyOptional({ type: Object, additionalProperties: true })
  @IsOptional()
  @IsObject()
  problemTimes?: Record<string, number>;

  // Анти-чит үйл явдал: шалгалтын горимоос гарсан/буцсан (Шийдвэр 3)
  @ApiPropertyOptional({ enum: ['LEAVE', 'RETURN', 'FULLSCREEN_EXIT'] })
  @IsOptional()
  @IsIn(['LEAVE', 'RETURN', 'FULLSCREEN_EXIT'])
  event?: 'LEAVE' | 'RETURN' | 'FULLSCREEN_EXIT';
}

export class SubmitTestDto extends SaveSessionDto {}
