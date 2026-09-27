import { IsIn } from 'class-validator';

export const JOB_NAMES = ['payment-due', 'homework-due', 'mistakes-review', 'parent-weekly'] as const;
export type JobName = (typeof JOB_NAMES)[number];
export class RunJobDto {
  @IsIn(JOB_NAMES)
  name!: JobName;
}
