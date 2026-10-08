import { Equals, IsBoolean, ValidateIf } from 'class-validator';

export const PRIVACY_VERSION = '2026-09-26-draft';

export class ConsentDto {
  @IsBoolean()
  @Equals(true, {
    message: 'Үйлчилгээний нөхцөл, нууцлалын бодлогыг зөвшөөрнө үү',
  })
  acceptTerms: boolean;

  @Equals(PRIVACY_VERSION, {
    message: 'Бодлогын шинэ хувилбарыг уншихын тулд хуудсаа шинэчилнэ үү',
  })
  privacyVersion: string;

  @IsBoolean({ message: 'Насны сонголтоо хийнэ үү' })
  isMinor: boolean;

  @ValidateIf((value: ConsentDto) => value.isMinor === true)
  @IsBoolean()
  @Equals(true, {
    message: 'Эцэг эх, хууль ёсны төлөөлөгчийн зөвшөөрөл шаардлагатай',
  })
  guardianConsent?: boolean;
}
