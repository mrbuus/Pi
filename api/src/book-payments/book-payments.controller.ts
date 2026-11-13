import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { SetBookPaymentDto } from './book-payments.dto';
import { BOOKS } from './book-payments.logic';
import { BookPaymentsService } from './book-payments.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/**
 * «Номын мөнгө» (эзэн 2026-11-12) — сурагчийн хуудас ба «Дотоод» самбар.
 * Аль ч багш аль ч ангийн сурагчийн номын мөнгийг авч болно, тиймээс бүх
 * төвийн багш (ADMIN/TEACHER_PLUS/TEACHER). Ангийн чекээс тэмдэглэх зам нь
 * classrooms/:id/checks (class-checks).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller('book-payments')
export class BookPaymentsController {
  constructor(private readonly books: BookPaymentsService) {}

  /** Номын жагсаалт (чек нээх маягт) */
  @Get('books')
  catalogue() {
    return BOOKS;
  }

  /** «Хэн авсан» сонгогчийн багш нар */
  @Get('collectors')
  collectors(@Req() req: AuthedRequest) {
    return this.books.collectors(req.user.userId);
  }

  @Get('dashboard')
  dashboard(@Req() req: AuthedRequest) {
    return this.books.dashboard(req.user.userId);
  }

  @Get('students/:studentId')
  studentBooks(
    @Req() req: AuthedRequest,
    @Param('studentId') studentId: string,
  ) {
    return this.books.studentBooks(studentId, req.user.userId);
  }

  @Put('students/:studentId/books/:bookKey')
  set(
    @Req() req: AuthedRequest,
    @Param('studentId') studentId: string,
    @Param('bookKey') bookKey: string,
    @Body() dto: SetBookPaymentDto,
  ) {
    return this.books.setFromProfile(studentId, bookKey, dto, req.user.userId);
  }
}
