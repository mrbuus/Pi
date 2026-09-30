import { IsBoolean, ValidateIf } from 'class-validator';

export class NotificationPreferenceDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  emailWeekly?: boolean;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  emailReminders?: boolean;
}
