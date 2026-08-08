import { Request } from 'express';
import { Role } from '../generated/prisma/enums';

export interface RequestWithUser extends Request {
  user: {
    id: string;
    userId?: string; // Зарим хэсэгт userId ашигладаг
    role: Role;
  };
}
