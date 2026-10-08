import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { CENTRE_KNOWLEDGE, KNOWLEDGE_VERSION, retrieveKnowledge } from './knowledge';

export class HelpQuestionDto {
  @IsString()
  @Length(2, 400)
  question!: string;
}

/** Public authored FAQ retrieval. No access to private tables, no AI provider. */
@Controller('centre-help')
export class CentreHelpController {
  @Get('topics')
  topics() {
    return { version: KNOWLEDGE_VERSION, topics: CENTRE_KNOWLEDGE.map(({ id, question }) => ({ id, question })) };
  }

  @Post('ask')
  ask(@Body() dto: HelpQuestionDto) {
    const matches = retrieveKnowledge(dto.question);
    return { version: KNOWLEDGE_VERSION, mode: 'authored-retrieval', matches, fallback: matches.length ? null : 'Энэ асуултын баталгаатай хариу туслахын мэдээлэлд алга байна. Төвтэй холбогдох эсвэл санал хүсэлт илгээнэ үү.' };
  }
}
