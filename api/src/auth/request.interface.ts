import { Request } from 'express';
import { Role } from '../generated/prisma/enums';

/**
 * JwtStrategy.validate()-ийн буцаадаг хэлбэртэй ЯГ таарна: `{ userId, role }`.
 *
 * Өмнө нь энд `id` гэж бичигдсэн байсан тул store/finance/tuition нь
 * `req.user.id`, teacher-groups нь `req.user.sub` уншиж, бүгд `undefined`
 * авдаг байв (2026-09-26 засав). Жишээ нь `myPurchases(undefined)` нь Prisma-д
 * шүүлтүүргүй query болж БҮХ хүний худалдан авалтыг буцаах эрсдэлтэй.
 */
export interface RequestWithUser extends Request {
  user: {
    userId: string;
    role: Role;
  };
}
