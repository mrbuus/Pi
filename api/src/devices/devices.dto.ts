import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export const DEVICE_PLATFORMS = ['ios', 'android'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

// ValidationPipe({whitelist:true}) decorator-гүй талбарыг чимээгүй хасдаг тул заавал.
export class RegisterDeviceDto {
  /** FCM registration token (~160–200 тэмдэгт) */
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;

  @ApiProperty({ enum: DEVICE_PLATFORMS })
  @IsIn(DEVICE_PLATFORMS, { message: 'Платформ буруу байна (ios эсвэл android)' })
  platform: DevicePlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;
}
