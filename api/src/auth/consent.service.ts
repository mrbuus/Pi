import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsentDto, PRIVACY_VERSION } from './dto/consent.dto';

export function consentData(dto: ConsentDto, now = new Date()) {
  if (
    dto.acceptTerms !== true ||
    dto.privacyVersion !== PRIVACY_VERSION ||
    typeof dto.isMinor !== 'boolean' ||
    (dto.isMinor && dto.guardianConsent !== true)
  ) {
    throw new BadRequestException(
      'Нөхцөл болон шаардлагатай зөвшөөрлийг баталгаажуулна уу',
    );
  }
  // This records the account holder's declaration, not verified guardianship.
  return {
    termsAcceptedAt: now,
    privacyVersion: PRIVACY_VERSION,
    guardianConsentAt: dto.isMinor && dto.guardianConsent === true ? now : null,
  };
}

@Injectable()
export class ConsentService {
  constructor(private readonly prisma: PrismaService) {}
  async status(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        termsAcceptedAt: true,
        privacyVersion: true,
        guardianConsentAt: true,
      },
    });
    if (!user) throw new NotFoundException('Бүртгэл олдсонгүй');
    return {
      ...user,
      currentVersion: PRIVACY_VERSION,
      needsConsent:
        !user.termsAcceptedAt || user.privacyVersion !== PRIVACY_VERSION,
    };
  }
  async accept(userId: string, dto: ConsentDto) {
    const data = consentData(dto);
    const before = await this.status(userId);
    if (!before.needsConsent) return before;
    await this.prisma.user.updateMany({
      where: {
        id: userId,
        OR: [
          { privacyVersion: null },
          { privacyVersion: { not: PRIVACY_VERSION } },
          { termsAcceptedAt: null },
        ],
      },
      data,
    });
    return this.status(userId);
  }
}
