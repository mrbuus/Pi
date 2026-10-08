import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationPreferenceDto } from './notification-preference.dto';

describe('NotificationPreferenceDto', () => {
  it('accepts optional boolean switches and rejects null/string values', async () => {
    expect(await validate(plainToInstance(NotificationPreferenceDto, { emailWeekly: false }))).toHaveLength(0);
    expect(await validate(plainToInstance(NotificationPreferenceDto, { emailReminders: null }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(NotificationPreferenceDto, { emailWeekly: 'false' }))).not.toHaveLength(0);
  });
});
