import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional } from 'class-validator';
import { SESSION_EVENTS, type SessionEvent } from '../integrity-events';

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

  // Анти-чит үйл явдал: шалгалтын горимоос гарсан/буцсан (Шийдвэр 3).
  // Гар утасны апп: SCREENSHOT, RECORDING_START/STOP — leaveCount-ийг нэмэхгүй,
  // зөвхөн events-д бичигдэнэ (integrity-events.ts).
  @ApiPropertyOptional({ enum: SESSION_EVENTS })
  @IsOptional()
  @IsIn(SESSION_EVENTS)
  event?: SessionEvent;
}

export class SubmitTestDto extends SaveSessionDto {}
