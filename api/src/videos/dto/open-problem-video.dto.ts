import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class OpenProblemVideoDto {
  @IsString() @IsNotEmpty() @MaxLength(200) problemId: string;
}
