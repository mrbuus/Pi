import { IsIn, IsObject, IsOptional } from 'class-validator';

// Session-ийн autosave БА эцсийн илгээлт хоёул ижил хэлбэртэй: клиент юу
// өөрчлөгдснөө л явуулна, сервер session-ий draft дээр нэгтгэнэ. Ингэснээр
// «эцсийн хариулт тооцогдоно» (last-answer-wins) зарчим автоматаар биелнэ.
export class SaveSessionDto {
  // { problemId: displayIdx(number) | үсэг | утга } — горимоос хамаарна
  @IsOptional()
  @IsObject()
  answers?: Record<string, unknown>;

  // { problemId: SelfState } — өөрийн тэмдэглэгээ (SPEC §9.1)
  @IsOptional()
  @IsObject()
  selfStates?: Record<string, string>;

  // { problemId: сек } — бодлого бүр дээр зарцуулсан бодит хугацаа
  @IsOptional()
  @IsObject()
  problemTimes?: Record<string, number>;

  // Анти-чит үйл явдал: шалгалтын горимоос гарсан/буцсан (Шийдвэр 3)
  @IsOptional()
  @IsIn(['LEAVE', 'RETURN', 'FULLSCREEN_EXIT'])
  event?: 'LEAVE' | 'RETURN' | 'FULLSCREEN_EXIT';
}

export class SubmitTestDto extends SaveSessionDto {}
