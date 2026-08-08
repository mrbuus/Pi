import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import type { RequestWithUser } from '../auth/request.interface';
import type { PurchaseDto, CreateProductDto, UpdatePriceDto } from './dto/purchase.dto';

// main.ts дээр setGlobalPrefix('api') бий — энд 'api/' давхардуулбал
// зам нь /api/api/… болж, клиент 404 авна (2026-08-08-нд яг ингэж болсон).
@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  /**
   * GET /api/store/products — бүтээгдэхүүнүүдийн жагсаалт (нийтэд)
   */
  @Get('products')
  listProducts() {
    return this.storeService.listProducts();
  }

  /**
   * POST /api/store/purchase — бүтээгдэхүүнийг худалдаж авах
   */
  @UseGuards(JwtAuthGuard)
  @Post('purchase')
  purchase(
    @Request() req: RequestWithUser,
    @Body() dto: PurchaseDto,
  ) {
    return this.storeService.purchase(req.user.id, dto.productItemId, dto.paymentId);
  }

  /**
   * GET /api/store/my-purchases — миний худалдан авалтууд
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-purchases')
  myPurchases(@Request() req: RequestWithUser) {
    return this.storeService.myPurchases(req.user.id);
  }

  /**
   * POST /api/store/admin/products — бүтээгдэхүүн үүсгэх (админ)
   */
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('admin/products')
  createProduct(
    @Request() req: RequestWithUser,
    @Body() dto: CreateProductDto,
  ) {
    return this.storeService.createProduct(
      dto.kind as any, // ProductKind enum
      dto.refId,
      dto.price,
      req.user.id,
      req.user.role,
      dto.includesVideo ?? false,
    );
  }

  /**
   * POST /api/store/admin/products/:id/deactivate — идэвхгүй болгох
   */
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('admin/products/:id/deactivate')
  deactivateProduct(
    @Request() req: RequestWithUser,
    @Param('id') productItemId: string,
  ) {
    return this.storeService.deactivateProduct(
      productItemId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * POST /api/store/admin/products/:id/price — үнэ солих
   */
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('admin/products/:id/price')
  updatePrice(
    @Request() req: RequestWithUser,
    @Param('id') productItemId: string,
    @Body() dto: UpdatePriceDto,
  ) {
    return this.storeService.updatePrice(
      productItemId,
      dto.price,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * GET /api/store/admin/products — админ: бүх бүтээгдэхүүнийг авах
   */
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('admin/products')
  adminGetAllProducts(@Request() req: RequestWithUser) {
    return this.storeService.adminGetAllProducts();
  }

  /**
   * GET /api/store/admin/purchases — админ: бүх худалдан авалтуудыг авах
   */
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('admin/purchases')
  adminGetAllPurchases(@Request() req: RequestWithUser) {
    return this.storeService.adminGetAllPurchases();
  }

  /**
   * GET /api/store/admin/revenue — админ: орлогын хураангуй
   */
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('admin/revenue')
  adminGetRevenueSummary(@Request() req: RequestWithUser) {
    return this.storeService.adminGetRevenueSummary();
  }
}
